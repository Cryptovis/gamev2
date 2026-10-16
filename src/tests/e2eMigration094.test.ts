import {describe,expect,it} from 'vitest';

// The Playwright specs cannot run inside Vitest, but they can be read. These checks keep the entry-screen migration
// from regressing: no spec may use the retired entry markup again, and the landing spec must keep its scenarios.
const specs=import.meta.glob<string>(['../../e2e/*.ts','../../e2e/helpers/*.ts'],{query:'?raw',import:'default',eager:true});
const files=Object.entries(specs).map(([path,text])=>({path:path.replace('../../',''),text}));
const RETIRED=['data-entry','.load-previous','.entry-shell','.entry-languages','.entry-form','.entry-content','.wizard-leadership-quote','Back to sign in','Create a demo account'];

describe('e2e migration to the landing screen',()=>{
  it('finds the e2e sources',()=>expect(files.length).toBeGreaterThan(40));
  it('uses no retired entry markup in any spec or helper',()=>{
    for(const {path,text} of files)for(const needle of RETIRED)expect(text.includes(needle),`${path} still uses ${needle}`).toBe(false);
  });
  it('has the shared guest helper with its three entry points',()=>{
    const helper=files.find(file=>file.path==='e2e/helpers/enterAsGuest.ts')?.text??'';
    for(const name of ['enterAsGuest','continueCampaign','chooseLanguage','landingReady'])expect(helper).toContain(`export async function ${name}`);
    expect(helper).toContain('landing-hero');
  });
  it('imports the helper wherever a spec enters or continues a campaign',()=>{
    for(const {path,text} of files){
      if(path.startsWith('e2e/helpers/'))continue;
      for(const name of ['enterAsGuest','continueCampaign'])if(new RegExp(`\\b${name}\\(`).test(text))expect(text,`${path} uses ${name}`).toMatch(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from '\\./helpers/enterAsGuest'`));
    }
  });
  it('keeps every landing scenario from the blueprint in landingExperience.spec.ts',()=>{
    const text=files.find(file=>file.path==='e2e/landingExperience.spec.ts')?.text??'';
    const numbers=[...text.matchAll(/^test\('(\d+) /gm)].map(match=>Number(match[1]));
    expect(numbers).toEqual(Array.from({length:14},(_,index)=>index+1));
  });
});
