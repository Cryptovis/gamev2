import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {campaignFixture,resumeFixture} from '../e2e/seedCampaign';

/**
 * Phase 2 typography and layout review. Opens the main screens, records every visible text element's
 * computed size and case, finds text that overflows its box, and saves screenshots for inspection.
 * Output: performance/results/visual-<label>.json and test-results/visual/*.png.
 */
type Screen={name:string;open:(page:Page)=>Promise<void>};
const rail=(guide:string,target:string)=>async(page:Page)=>{await page.locator(`[data-guide="${guide}"]`).click();await expect(page.locator(target)).toBeVisible();};
const nation=(tab?:string)=>async(page:Page)=>{await page.locator('[data-guide="nation"]').click();await expect(page.locator('.command-panel')).toBeVisible();if(tab){await page.locator(`[data-guide="tab-${tab}"]`).click();}};
const SCREENS:Screen[]=[
 {name:'map',open:async()=>{}},
 {name:'market',open:rail('rail-market','#market-window')},
 {name:'world',open:rail('rail-world','#pulse-window')},
 {name:'supply',open:rail('rail-supply','#resource-command-window')},
 {name:'goals',open:rail('rail-goals','#objectives-window')},
 {name:'diplomacy',open:rail('rail-diplo','#diplomacy-window')},
 {name:'alerts',open:rail('rail-alerts','#alerts-window')},
 {name:'news',open:rail('rail-news','#sitrep-window')},
 {name:'help',open:rail('rail-help','#help-window')},
 {name:'nation',open:nation()},
 ...['economy','policies','trade','production','diplomacy','military','technology','world','war'].map(tab=>({name:`nation-${tab}`,open:nation(tab)})),
 {name:'dossier',open:async page=>{await nation()(page);await page.locator('[data-guide="tab-power"]').click();await expect(page.locator('.command-window')).toBeVisible();}},
 {name:'supply-command',open:async page=>{await nation()(page);await page.locator('[data-guide="tab-supply-command"]').click();await expect(page.locator('.command-window')).toBeVisible();}},
 {name:'affairs',open:async page=>{await nation()(page);await page.locator('[data-guide="tab-affairs"]').click();}},
];

async function audit(page:Page){
 return page.evaluate(()=>{
  const describe=(el:Element)=>{const parts:string[]=[];let node:Element|null=el;for(let i=0;node&&i<3;i++,node=node.parentElement){const cls=[...node.classList].slice(0,2).join('.');parts.unshift(node.tagName.toLowerCase()+(cls?'.'+cls:''));}return parts.join(' > ');};
  const small:Record<string,{size:number;count:number;sample:string}>={};const upper:Record<string,{count:number;sample:string}>={};const overflow:{where:string;text:string;scroll:number;client:number}[]=[];
  const sizes:Record<string,number>={};
  for(const el of document.querySelectorAll('body *')){
   const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent??'').join('').trim();
   if(!text||!(el as HTMLElement).getClientRects().length)continue;
   const style=getComputedStyle(el);if(style.visibility==='hidden'||el.closest('[hidden],[aria-hidden="true"]'))continue;
   const size=parseFloat(style.fontSize);sizes[size.toFixed(1)]=(sizes[size.toFixed(1)]??0)+1;
   if(size<10.5){const key=describe(el);small[key]??={size,count:0,sample:text.slice(0,40)};small[key].count++;}
   const rendersUpper=style.textTransform==='uppercase'||(text.length>3&&text===text.toUpperCase()&&/[A-ZÇĞİÖŞÜ]{4}/.test(text));
   if(rendersUpper&&text.length>18){const key=describe(el);upper[key]??={count:0,sample:text.slice(0,48)};upper[key].count++;}
   const h=el as HTMLElement;if(style.overflow!=='visible'||style.textOverflow==='ellipsis'){if(h.scrollWidth>h.clientWidth+2&&h.clientWidth>0&&style.whiteSpace!=='normal')overflow.push({where:describe(el),text:text.slice(0,40),scroll:h.scrollWidth,client:h.clientWidth});}
  }
  const pageOverflow=document.documentElement.scrollWidth>window.innerWidth+1;
  return {sizes,small:Object.entries(small).map(([where,v])=>({where,...v})).sort((a,b)=>a.size-b.size),upper:Object.entries(upper).map(([where,v])=>({where,...v})),overflow:overflow.slice(0,40),pageOverflow};
 });
}

const VIEWPORTS=[{width:1440,height:900,language:'en'},{width:390,height:844,language:'tr'},{width:1440,height:900,language:'ru'}] as const;
test('Phase 2 typography and layout review',async({browser})=>{
 test.setTimeout(30*60_000);
 const label=(process.env.PERFORMANCE_LABEL??'current').replace(/[^a-zA-Z0-9_-]/g,'_');
 mkdirSync('test-results/visual',{recursive:true});mkdirSync('performance/results',{recursive:true});
 const report:Record<string,unknown>={};
 for(const vp of VIEWPORTS){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},reducedMotion:'reduce'});const page=await context.newPage();
  for(const screen of SCREENS){
   const key=`${vp.language}-${vp.width}-${screen.name}`;
   try{const s=campaignFixture(vp.language);s.selectedCountryId=null;await resumeFixture(page,s);await expect(page.locator('.country-shape').first()).toBeAttached();await screen.open(page);await page.waitForTimeout(250);}
   catch(error){report[key]={skipped:String(error).slice(0,160)};continue;}
   report[key]=await audit(page);
   await page.screenshot({path:`test-results/visual/${key}.png`});
  }
  await context.close();
 }
 // Entry and setup screens.
 const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
 await page.goto('/');await expect(page.locator('[data-entry="demo"]')).toBeVisible();await page.screenshot({path:'test-results/visual/entry-login.png'});report['entry-login']=await audit(page);
 await page.locator('[data-entry="demo"]').click();await page.screenshot({path:'test-results/visual/entry-hub.png'});
 await page.locator('[data-entry="new-game"]').click();await page.waitForTimeout(300);await page.screenshot({path:'test-results/visual/setup.png'});report['setup']=await audit(page);
 await context.close();
 writeFileSync(`performance/results/visual-${label}.json`,JSON.stringify(report,null,1)+'\n');
});
