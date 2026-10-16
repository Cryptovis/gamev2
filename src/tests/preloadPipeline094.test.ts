import {describe,expect,it} from 'vitest';
import {PRELOAD_STAGE_ORDER,STAGE_RANGE,percentAt,runPreload,type PreloadProgress,type PreloadStage,type PreloadStageId} from '../ui/loading/preloadPipeline';
import {DICTIONARY_PROBE_KEYS,PRELOAD_ASSETS,buildPreloadStages,inspectLoadedState,type PreloadServices} from '../ui/loading/preloadStages';

const stage=(id:PreloadStageId,run:PreloadStage['run']=async report=>{report(.5);return {ok:true};}):PreloadStage=>({id,run});
const collect=async(stages:PreloadStage[],cancelled=()=>false)=>{
  const seen:PreloadProgress[]=[];
  const result=await runPreload(stages,p=>seen.push(p),cancelled);
  return {seen,result};
};

describe('stage ranges',()=>{
  it('cover 0 to 99 in order without gaps or overlap',()=>{
    let edge=0;
    for(const id of PRELOAD_STAGE_ORDER){expect(STAGE_RANGE[id][0]).toBe(edge);edge=STAGE_RANGE[id][1];}
    expect(edge).toBe(99);
  });
  it('matches the specified slices',()=>{
    expect(STAGE_RANGE).toEqual({hydrate:[0,25],graphics:[25,55],indexes:[55,80],workspace:[80,99]});
  });
  it('maps a fraction into the slice, clamps it and ignores NaN',()=>{
    expect(percentAt('graphics',0)).toBe(25);
    expect(percentAt('graphics',1)).toBe(55);
    expect(percentAt('graphics',.5)).toBe(40);
    expect(percentAt('graphics',-3)).toBe(25);
    expect(percentAt('graphics',9)).toBe(55);
    expect(percentAt('graphics',Number.NaN)).toBe(25);
    expect(percentAt('workspace',1)).toBe(99);
  });
});

describe('runPreload',()=>{
  it('runs every stage in order, ends at 99 and never goes backwards',async()=>{
    const {seen,result}=await collect(PRELOAD_STAGE_ORDER.map(id=>stage(id)));
    expect(result).toEqual({ok:true,warnings:[]});
    const percents=seen.map(p=>p.percent);
    expect(percents[0]).toBe(0);
    expect(percents[percents.length-1]).toBe(99);
    expect(percents).toEqual([...percents].sort((a,b)=>a-b));
    expect(seen.map(p=>p.stage).filter((s,i,all)=>all.indexOf(s)===i)).toEqual([...PRELOAD_STAGE_ORDER]);
  });
  it('gives identical progress for identical inputs',async()=>{
    const first=await collect(PRELOAD_STAGE_ORDER.map(id=>stage(id)));
    const second=await collect(PRELOAD_STAGE_ORDER.map(id=>stage(id)));
    expect(second.seen).toEqual(first.seen);
  });
  it('ignores a stage that reports backwards',async()=>{
    const {seen}=await collect([stage('hydrate',async report=>{report(.8);report(.2);return {ok:true};})]);
    const percents=seen.map(p=>p.percent);
    expect(percents).toEqual([...percents].sort((a,b)=>a-b));
  });
  it('stops at a stage that fails and names it',async()=>{
    const ran:string[]=[];
    const {result}=await collect([stage('hydrate',async()=>({ok:false,reason:'corrupt'})),stage('graphics',async()=>{ran.push('graphics');return {ok:true};})]);
    expect(result).toEqual({ok:false,reason:'corrupt',stage:'hydrate'});
    expect(ran).toEqual([]);
  });
  it('treats a hydrate error as unknown but other errors as warnings',async()=>{
    const boom=async()=>{throw new Error('boom');};
    expect((await collect([stage('hydrate',boom)])).result).toEqual({ok:false,reason:'unknown',stage:'hydrate'});
    const {result}=await collect([stage('graphics',boom),stage('workspace')]);
    expect(result).toMatchObject({ok:true});
    expect((result as {warnings:string[]}).warnings).toEqual(['graphics stage failed']);
  });
  it('collects warnings from successful stages',async()=>{
    const {result}=await collect([stage('indexes',async()=>({ok:true,warnings:['a','b']})),stage('workspace',async()=>({ok:true,warnings:['c']}))]);
    expect(result).toEqual({ok:true,warnings:['a','b','c']});
  });
  it('returns null and reports nothing once cancelled',async()=>{
    let cancelled=false;
    const seen:PreloadProgress[]=[];
    const result=await runPreload([stage('hydrate',async()=>{cancelled=true;return {ok:true};}),stage('graphics')],p=>seen.push(p),()=>cancelled);
    expect(result).toBeNull();
    expect(seen.every(p=>p.stage==='hydrate'&&p.percent===0)).toBe(true);
  });
});

const services=(over:Partial<PreloadServices>={}):PreloadServices=>({
  loadLatest:async()=>true,inspectState:()=>({ok:true}),assets:['/a.svg','/b.webp'],decodeAsset:async()=>{},languages:['en','tr'],
  translate:(language,key)=>language==='en'?key:`${key}·${language}`,countryCount:()=>3,fontsReady:async()=>{},audioState:()=>'ready',yieldToBrowser:async()=>{},...over,
});
const run=(intent:'new'|'continue',over:Partial<PreloadServices>={})=>collect(buildPreloadStages(intent,services(over)));

describe('real stages',()=>{
  it('finish cleanly when everything is in order',async()=>{
    const {result}=await run('continue');
    expect(result).toEqual({ok:true,warnings:[]});
  });
  it('load the save only for a continued campaign',async()=>{
    let loads=0;
    await run('new',{loadLatest:async()=>{loads++;return true;}});
    expect(loads).toBe(0);
    await run('continue',{loadLatest:async()=>{loads++;return true;}});
    expect(loads).toBe(1);
  });
  it('fail as missing when there is no save, and as unknown when loading throws',async()=>{
    expect((await run('continue',{loadLatest:async()=>false})).result).toEqual({ok:false,reason:'missing',stage:'hydrate'});
    expect((await run('continue',{loadLatest:async()=>{throw new Error('x');}})).result).toEqual({ok:false,reason:'unknown',stage:'hydrate'});
  });
  it('fail as corrupt when the loaded state does not look like a campaign',async()=>{
    expect((await run('continue',{inspectState:()=>({ok:false,reason:'corrupt'})})).result).toEqual({ok:false,reason:'corrupt',stage:'hydrate'});
  });
  it('warn but do not fail when a picture cannot be decoded',async()=>{
    const {result}=await run('new',{decodeAsset:async url=>{if(url==='/b.webp')throw new Error('bad');}});
    expect(result).toEqual({ok:true,warnings:['could not decode /b.webp']});
  });
  it('report graphics progress inside its slice, one step per asset',async()=>{
    const {seen}=await run('new');
    const graphics=seen.filter(p=>p.stage==='graphics').map(p=>p.percent);
    expect(graphics[0]).toBe(25);
    expect(graphics).toContain(40);
    expect(graphics[graphics.length-1]).toBe(55);
  });
  it('warn about an empty or untranslated dictionary entry and an empty country index',async()=>{
    const {result}=await run('new',{translate:(language,key)=>language==='tr'?key:language==='en'&&key==='Play now'?'':key,countryCount:()=>0});
    const warnings=(result as {warnings:string[]}).warnings;
    expect(warnings).toContain('en: empty text for "Play now"');
    expect(warnings).toContain('tr: "Main menu" is not translated');
    expect(warnings).toContain('country index is empty');
  });
  it('warn when audio is unavailable or fonts never become ready, and still finish',async()=>{
    const {result}=await run('new',{audioState:()=>'unavailable',fontsReady:()=>new Promise<void>(()=>{})});
    expect(result).toMatchObject({ok:true});
    expect((result as {warnings:string[]}).warnings).toEqual(['fonts were not ready in time','audio is unavailable']);
  },10000);
});

describe('state check and lists',()=>{
  it('accepts a structurally sound campaign',()=>expect(inspectLoadedState({countries:{TUR:{}},playerCountryId:'TUR',day:0})).toEqual({ok:true}));
  it('rejects missing countries, an unknown player country and a bad day',()=>{
    expect(inspectLoadedState({countries:{},playerCountryId:'TUR',day:1})).toEqual({ok:false,reason:'corrupt'});
    expect(inspectLoadedState({countries:{TUR:{}},playerCountryId:'FRA',day:1})).toEqual({ok:false,reason:'corrupt'});
    expect(inspectLoadedState({countries:{TUR:{}},playerCountryId:'TUR',day:Number.NaN})).toEqual({ok:false,reason:'corrupt'});
    expect(inspectLoadedState({})).toEqual({ok:false,reason:'corrupt'});
  });
  it('lists distinct assets and non-empty probe keys',()=>{
    expect(PRELOAD_ASSETS.length).toBeGreaterThan(10);
    expect(new Set(PRELOAD_ASSETS).size).toBe(PRELOAD_ASSETS.length);
    expect(DICTIONARY_PROBE_KEYS.every(key=>key.trim().length>0)).toBe(true);
  });
});
