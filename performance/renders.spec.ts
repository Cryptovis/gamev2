import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resumeFixture} from '../e2e/seedCampaign';
import {measuredCampaign} from './campaign';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

/**
 * Phase 2 render attribution. Runs only against the RON_PROFILE=1 build (unminified React
 * profiling bundle, see vite.config.ts and performance/renders.config.ts). A minimal DevTools
 * hook counts the function components that actually rendered in each commit: a fiber rendered
 * in a commit when its actualStartTime is later than the previous commit and its props or hook
 * state object changed (parents that merely pass work down keep both). Timings include the
 * probe's own overhead and are only used for relative comparison between builds.
 */
const probe=()=>{
 type Fiber={tag:number;type:any;child:Fiber|null;sibling:Fiber|null;alternate:Fiber|null;memoizedProps:unknown;memoizedState:unknown;actualStartTime?:number;selfBaseDuration?:number};
 // Ancestors that only pass work down to a child are cloned with identical props/state; only count fibers that actually re-ran.
 const ran=(f:Fiber)=>!f.alternate||f.memoizedProps!==f.alternate.memoizedProps||f.memoizedState!==f.alternate.memoizedState;
 const w=window as any;let last=performance.now();
 const stats:Record<string,{renders:number;selfMs:number}>={};
 w.__ronRenders={recording:false,commits:0,stats,reset(){this.commits=0;for(const k of Object.keys(stats))delete stats[k];last=performance.now();}};
 const nameOf=(f:Fiber)=>{const t=f.type;if(!t)return null;if(typeof t==='function')return t.displayName||t.name||null;if(t.type)return nameOf({...f,type:t.type});if(t.render)return t.render.displayName||t.render.name||null;return null;};
 const renderers=new Map();
 w.__REACT_DEVTOOLS_GLOBAL_HOOK__={renderers,supportsFiber:true,isDisabled:false,
  inject(r:unknown){const id=renderers.size+1;renderers.set(id,r);return id;},
  checkDCE(){},onScheduleFiberRoot(){},onCommitFiberUnmount(){},onPostCommitFiberRoot(){},setStrictMode(){},
  onCommitFiberRoot(_id:number,root:{current:Fiber}){
   const r=w.__ronRenders;
   if(r.recording){
    r.commits++;
    const stack:Fiber[]=[root.current];
    while(stack.length){
     const f=stack.pop()!;
     // 0 function, 1 class, 11 forwardRef, 14 memo, 15 simple memo
     if([0,1,11,14,15].includes(f.tag)&&(f.actualStartTime??-1)>=last&&ran(f)){const n=nameOf(f);if(n){const s=stats[n]??={renders:0,selfMs:0};s.renders++;s.selfMs+=f.selfBaseDuration??0;}}
     if(f.sibling)stack.push(f.sibling);if(f.child)stack.push(f.child);
    }
   }
   last=performance.now();
  }};
};

type Scenario={name:string;open:(page:Page)=>Promise<void>};
const rail=(guide:string,target:string)=>async(page:Page)=>{await page.locator(`[data-guide="${guide}"]`).click();await expect(page.locator(target)).toBeVisible();};
const nationTab=(tab:string)=>async(page:Page)=>{await page.locator('[data-guide="nation"]').click();await page.locator(`[data-guide="tab-${tab}"]`).click();await expect(page.locator(`[data-guide="tab-${tab}"]`)).toHaveAttribute('aria-pressed','true');};
const SCENARIOS:Scenario[]=[
 {name:'map only',open:async()=>{}},
 {name:'market',open:rail('rail-market','#market-window')},
 {name:'world',open:rail('rail-world','#pulse-window')},
 {name:'supply',open:rail('rail-supply','#resource-command-window')},
 {name:'goals',open:rail('rail-goals','#objectives-window')},
 {name:'diplomacy',open:rail('rail-diplo','#diplomacy-window')},
 {name:'alerts',open:rail('rail-alerts','#alerts-window')},
 {name:'help',open:rail('rail-help','#help-window')},
 ...['economy','policies','trade','production','diplomacy','military','technology','world','war'].map(tab=>({name:`nation/${tab}`,open:nationTab(tab)})),
];
const WINDOW_MS=6200;

test('Phase 2 render attribution at 5x',async({page})=>{
 test.setTimeout(20*60_000);
 await page.addInitScript(probe);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const state=measuredCampaign(30);
 const reports=[];
 for(const scenario of SCENARIOS){
  await resumeFixture(page,state);await expect(page.locator('.country-shape').first()).toBeAttached();
  try{await scenario.open(page);}catch(error){reports.push({scenario:scenario.name,skipped:String(error).slice(0,200)});continue;}
  await page.waitForTimeout(400);
  await page.evaluate(()=>{const r=(window as any).__ronRenders;r.reset();r.recording=true;});
  await page.locator('.speed-segment button').last().click();
  await page.waitForTimeout(WINDOW_MS);
  await page.locator('.speed-segment button').first().click();
  const result=await page.evaluate(()=>{const r=(window as any).__ronRenders;r.recording=false;return {commits:r.commits,day:document.querySelector('.campaign-clock strong')?.textContent,stats:JSON.parse(JSON.stringify(r.stats))};});
  const rows=Object.entries(result.stats as Record<string,{renders:number;selfMs:number}>).map(([name,s])=>({name,renders:s.renders,selfMs:Math.round(s.selfMs*100)/100}));
  const totalRenders=rows.reduce((a,r)=>a+r.renders,0),totalSelfMs=Math.round(rows.reduce((a,r)=>a+r.selfMs,0)*100)/100;
  reports.push({scenario:scenario.name,commits:result.commits,totalRenders,totalSelfMs,topByRenders:rows.sort((a,b)=>b.renders-a.renders).slice(0,25),topBySelfMs:[...rows].sort((a,b)=>b.selfMs-a.selfMs).slice(0,15)});
  console.log(`[renders] ${scenario.name}: commits=${result.commits} renders=${totalRenders} selfMs=${totalSelfMs}`);
 }
 expect(errors).toEqual([]);
 const label=(process.env.PERFORMANCE_LABEL??'current').replace(/[^a-zA-Z0-9_-]/g,'_');
 mkdirSync('performance/results',{recursive:true});
 writeFileSync(`performance/results/renders-${label}.json`,JSON.stringify({version,browser:page.context().browser()!.version(),viewport:page.viewportSize(),windowMs:WINDOW_MS,campaignDay:state.day,reports},null,2)+'\n');
});
