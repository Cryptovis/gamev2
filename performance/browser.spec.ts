import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
import {resumeFixture} from '../e2e/seedCampaign';
import {distribution,measuredCampaign} from './campaign';

async function paint(page:Page) {
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
async function clickToPaint(page:Page,selector:string) {
 return page.evaluate(selector=>new Promise<number>(resolve=>{
  const element=document.querySelector<HTMLElement>(selector);if(!element)throw new Error(`Missing ${selector}`);
  const started=performance.now();element.click();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-started)));
 }),selector);
}
test('measure cold entry, saved campaign resume, menus and map camera',async({browser})=>{
 let context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const cold:number[]=[];
 for(let i=0;i<5;i++){
  const session=await context.newCDPSession(page);await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.goto('/');await expect(page.locator('[data-entry="demo"]')).toBeVisible();await paint(page);
  cold.push(await page.evaluate(()=>performance.now()));await session.detach();
 }
 const reports=[];
 for(const days of [0,365,1095]){
  await context.close();context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const state=measuredCampaign(days);state.mapMode='relations';
  await resumeFixture(page,state);await expect(page.locator('.country-shape').first()).toBeAttached();await paint(page);
  const resume:number[]=[];
  for(let i=0;i<3;i++){
   await page.reload();await expect(page.locator('.load-previous')).toBeEnabled();
   await page.evaluate(()=>performance.mark('resume-start'));await clickToPaint(page,'.load-previous');await expect(page.locator('.country-shape').first()).toBeAttached();await paint(page);resume.push(await page.evaluate(()=>performance.now()-performance.getEntriesByName('resume-start').at(-1)!.startTime));
  }
  const menus:Record<string,ReturnType<typeof distribution>>={};
  for(const [name,selector,target] of [['market','[data-guide="rail-market"]','#market-window'],['world','[data-guide="rail-world"]','#pulse-window'],['supply','[data-guide="rail-supply"]','#resource-command-window']]){
   const times:number[]=[];
   for(let i=0;i<6;i++){const duration=await clickToPaint(page,selector);await expect(page.locator(target)).toBeVisible();if(i>0)times.push(duration);await page.keyboard.press('Escape');await paint(page);}
   menus[name]=distribution(times);
  }
  const map=page.locator('.strategy-svg');await map.focus();
  const camera:number[]=[];
  for(let i=0;i<12;i++)camera.push(await page.evaluate(i=>new Promise<number>(resolve=>{
   const start=performance.now();document.querySelector('.strategy-svg')!.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',bubbles:true}));requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));
  }),i));
  const session=await context.newCDPSession(page);await session.send('Performance.enable');const metrics=await session.send('Performance.getMetrics');await session.detach();
  console.log(`Measured campaign day ${state.day}`);
  reports.push({days,day:state.day,tradeDeals:Object.keys(state.tradeDeals).length,contracts:Object.keys(state.industrialContracts).length,resumeToMapPaintMs:distribution(resume),menuClickToPaintMs:menus,cameraKeyToPaintMs:distribution(camera),metrics:metrics.metrics.filter(m=>['JSHeapUsedSize','Nodes'].includes(m.name))});
 }
 expect(errors).toEqual([]);
 mkdirSync('performance/results',{recursive:true});writeFileSync(`performance/results/browser-${(process.env.PERFORMANCE_LABEL??'current').replace(/[^a-zA-Z0-9_-]/g,'_')}.json`,JSON.stringify({version,browser:browser.version(),viewport:{width:1440,height:900},coldEntryToPaintMs:distribution(cold),reports},null,2)+'\n');
 await context.close();
});

/**
 * playtest.17 (Phase 6.3): cost of the hillshade layer on camera moves. Same moves with the relief layer off ("before") and on ("after"),
 * flat and globe, on the geographic presentation so the Blue Marble surface and the relief render side by side.
 * Budget: the relief full-resolution frame takes at most 1.5x the surface frame. Run with `npm run measure:browser`.
 */
test('map relief layer: frame cost with and without the hillshade',async({browser})=>{
 const errors:string[]=[],reports:unknown[]=[];
 type Frame={duration:number;width:number;worker:boolean;variant?:string};
 for(const projection of ['flat','globe'] as const)for(const relief of [false,true]){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(value=>localStorage.setItem('trp-map-desk-v1',value),JSON.stringify({tilt:true,relief,pins:true}));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const state=measuredCampaign(0);state.mapPresentation='geographic';
  await resumeFixture(page,state);await expect(page.locator('.country-shape').first()).toBeAttached();
  if(projection==='flat'){ // the projection is a store setting, not part of a save
   await page.locator('[data-guide="rail-map"]').click();await page.locator('.map-command-sections > div').nth(1).locator('button').nth(1).click();
   await expect(page.locator('.strategy-svg')).toHaveClass(/flat-svg/);await page.locator('.map-close').click();
  }
  await expect(page.locator('[data-geographic-render="worker-ready"]')).toBeAttached({timeout:30000});
  if(relief)await expect(page.locator('[data-relief-render="worker-ready"]')).toBeAttached({timeout:30000});
  await page.evaluate(()=>{(window as any).__geoFrames=[];window.addEventListener('geographic-frame',e=>(window as any).__geoFrames.push((e as CustomEvent).detail));});
  await page.locator('.strategy-svg').focus();
  // Alternate zoom in and out so every move changes the view; wait between moves so each one also produces its full-resolution frame.
  const camera:number[]=[];
  for(let i=0;i<12;i++){
   camera.push(await page.evaluate(i=>new Promise<number>(resolve=>{
    const start=performance.now();document.querySelector('.strategy-svg')!.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'-':'+',bubbles:true}));requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));
   }),i));
   await page.waitForTimeout(450);
  }
  const frames=await page.evaluate(()=>(window as any).__geoFrames as Frame[]);
  const full=(variant:string,width:number)=>frames.filter(f=>(f.variant??'surface')===variant&&f.width===width).map(f=>f.duration);
  const surface=full('surface',1200),hillshade=full('relief',960);
  const report={projection,relief,cameraKeyToPaintMs:distribution(camera),surfaceFullFrameMs:surface.length?distribution(surface):null,reliefFullFrameMs:hillshade.length?distribution(hillshade):null,framesSeen:frames.length};
  reports.push(report);console.log(`${projection} relief=${relief}`,JSON.stringify(report));
  if(relief){
   expect(surface.length,'surface frames').toBeGreaterThan(0);expect(hillshade.length,'relief frames').toBeGreaterThan(0);
   expect(distribution(hillshade).median,'relief full frame vs surface full frame').toBeLessThanOrEqual(distribution(surface).median*1.5);
  }
  await context.close();
 }
 expect(errors).toEqual([]);
 mkdirSync('performance/results',{recursive:true});writeFileSync(`performance/results/relief-${(process.env.PERFORMANCE_LABEL??'current').replace(/[^a-zA-Z0-9_-]/g,'_')}.json`,JSON.stringify({version,browser:browser.version(),viewport:{width:1440,height:900},budget:'relief full frame <= 1.5x surface full frame',reports},null,2)+'\n');
});

test('Phase 1 CPU profile of broad-subscriber panels at 5x',async({page})=>{
 const reports=[];
 for(const [name,selector,target] of [['supply','[data-guide="rail-supply"]','#resource-command-window'],['world','[data-guide="rail-world"]','#pulse-window']]){
  const state=measuredCampaign(0);await resumeFixture(page,state);await page.locator(selector).click();await expect(page.locator(target)).toBeVisible();
  const session=await page.context().newCDPSession(page);await session.send('Profiler.enable');await session.send('Profiler.setSamplingInterval',{interval:1000});await session.send('Profiler.start');
  await page.evaluate(()=>{
   const clock=document.querySelector('.campaign-clock strong')!;
   (window as any).__phase1Changes=0;
   (window as any).__phase1Observer=new MutationObserver(()=>{(window as any).__phase1Changes++});
   (window as any).__phase1Observer.observe(clock,{subtree:true,characterData:true,childList:true});
  });
  await page.locator('.speed-segment button').last().click();
  const started=Date.now();await page.waitForTimeout(6200);await page.locator('.speed-segment button').first().click();
  const {profile}=await session.send('Profiler.stop');await session.detach();
  const clockChanges=await page.evaluate(()=>{(window as any).__phase1Observer.disconnect();return (window as any).__phase1Changes;});
  const names=new Map(profile.nodes.map(n=>[n.id,n.callFrame.functionName||'(anonymous)'])),counts:Record<string,number>={};
  for(const id of profile.samples??[]){const name=names.get(id)??'unknown';counts[name]=(counts[name]??0)+1;}
  reports.push({panel:name,elapsedMs:Date.now()-started,clockChanges,samples:profile.samples?.length??0,topSamples:Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12)});
  expect(clockChanges).toBeGreaterThan(0);
 }
 mkdirSync('performance/results',{recursive:true});writeFileSync('performance/results/phase1-browser.json',JSON.stringify({browser:page.context().browser()!.version(),viewport:page.viewportSize(),reports},null,2)+'\n');
});
