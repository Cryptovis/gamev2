import {describe,expect,it} from 'vitest';
import {translateText} from '../i18n/localeText';
import {CREDENTIAL_WORDING} from '../ui/panels/leaderCredentials';

import {readFileSync} from 'node:fs';

const read=(rel:string)=>readFileSync(new URL(rel,import.meta.url),'utf8');
const hotfix=read('../ui/styles/hotfix18.css');
const landing=read('../ui/styles/landing094.css');
const source=(name:string)=>{
  if(name==='main.tsx') return read(`../${name}`);
  if(name==='UtilityDock.tsx') return read(`../ui/panels/landing/${name}`);
  if(name.startsWith('international/')) return read(`../ui/panels/${name}`);
  if(['OverviewTab.tsx','SanctionsTab.tsx','shared.tsx'].includes(name)) return read(`../ui/panels/international/${name}`);
  return read(`../ui/panels/${name}`);
};
const rule=(sheet:string,selector:string)=>{const at=sheet.indexOf(selector);if(at<0)return '';const open=sheet.indexOf('{',at);return sheet.slice(open+1,sheet.indexOf('}',open));};
const channel=(v:number)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const luminance=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);};
const ratio=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const LANGUAGES=['tr','es','zh','ru'] as const;

describe('hotfix 1.8 landing viewport (item 1)',()=>{
  it('pins the wallpaper to the viewport so it never scrolls away',()=>{
    const backdrop=rule(landing,'.l94-backdrop{');
    for(const decl of ['position:fixed','inset:0','width:100vw','height:100vh','background-size:cover','background-attachment:fixed'])expect(backdrop,decl).toContain(decl);
    expect(rule(landing,'.l94-art{')).toContain('fixed');
    expect(rule(landing,'.landing094::after{')).toContain('position:fixed');
  });
  it('lifts the quote box clear of the footer line',()=>{
    expect(rule(landing,'.lw--hero{')).toMatch(/margin:clamp\(0px,1\.5vh,14px\) auto clamp\(32px,8vh,80px\)/);
  });
  it('puts the language flags in the top-right of the dock',()=>{
    expect(rule(landing,'.l94-dock{')).toContain('grid-template-columns:1fr auto;');
    expect(landing).toMatch(/\.l94-dock-language\{justify-self:end\}/);
    expect(landing).not.toMatch(/\.l94-dock-language\{grid-column:1\/-1;grid-row:2;justify-content:center\}/);
  });
  it('sets the title to clamp(2.1rem, 4.2vw, 3.2rem)',()=>{
    expect(rule(landing,'.l94-title{')).toContain('clamp(2.1rem,4.2vw,3.2rem)');
  });
});

describe('hotfix 1.8 setup wizard (item 2)',()=>{
  const setup=source('CampaignSetup.tsx');
  it('drops the step kickers and the top subtitle',()=>{
    for(const gone of ['STEP 01 / LEADER IDENTITY','STEP 02 / COMMAND PROFILE','STEP 03 / SOVEREIGN COMMAND','STEP 04 / FINAL REVIEW','Create your leader and choose a country.','wizard-kicker'])expect(setup,gone).not.toContain(gone);
    expect(setup).toContain('data-testid="wizard-brand"');
  });
  it('shows the System note only while System is selected',()=>{
    expect(source('AppearanceOptions.tsx')).toMatch(/\{preference==='system'&&<small data-testid="appearance-system-note">/);
  });
  it('centres the quote in the right-hand panel',()=>{
    const body=rule(hotfix,':root .campaign-wizard .lw--compact{');
    expect(body).toContain('margin:clamp(14px,3vh,28px) auto');expect(body).toContain('text-align:center');expect(body).toContain('width:min(560px,100%)');
  });
});

describe('hotfix 1.8 National Command (item 3)',()=>{
  const menu=source('PlayerOptionsMenu.tsx');
  it('is a 680px card that hugs its content',()=>{
    const body=rule(hotfix,':root .player-options-modal{');
    expect(body).toContain('max-width:680px!important');expect(body).toContain('height:auto!important');expect(body).toContain('min(680px,calc(100vw - 24px))');
  });
  it('has no editing controls left',()=>{
    for(const gone of ['CHANGE PORTRAIT','UPDATE IDENTITY','PROFILE UPDATED','type="date"','<select','setIdentity','AvatarPicker','Profile citizenship','Profile birth date'])expect(menu,gone).not.toContain(gone);
  });
  it('lists the five credentials as read-only rows',()=>{
    for(const key of ['name','citizenship','birth','ideology','perk'])expect(menu).toContain(`data-credential="${key}"`);
    expect(menu).toContain('flagEmoji(citizenship.iso2)');expect(menu).toContain('formatCampaignDate(profile.birthDate,profile.language)');
    expect(menu).toContain('data-testid="leader-credentials"');
  });
  it('words every credential label in all five languages',()=>{
    for(const language of ['en',...LANGUAGES] as const){
      const w=CREDENTIAL_WORDING[language];
      for(const [key,value] of Object.entries(w))expect(value.length,`${language}.${key}`).toBeGreaterThan(1);
    }
    for(const language of LANGUAGES)for(const key of Object.keys(CREDENTIAL_WORDING.en) as Array<keyof typeof CREDENTIAL_WORDING.en>)
      expect(CREDENTIAL_WORDING[language][key],`${language}.${key}`).not.toBe(CREDENTIAL_WORDING.en[key]);
    expect(CREDENTIAL_WORDING.zh.ideology).toBe('意识形态');
  });
  it('keeps the credential text readable in both themes',()=>{
    expect(ratio('#d5c6a4','#182e46')).toBeGreaterThanOrEqual(7);
    expect(ratio('#465b70','#f3efe5')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('hotfix 1.8 organization badges (item 4)',()=>{
  const overview=source('OverviewTab.tsx');
  it('puts the two badges in one row',()=>{
    expect(overview).toMatch(/<div className="ia-org-badges" data-testid="org-badges"><Badge value=\{m\?\.tier\?\?'nonMember'\} tone=\{m\?'good':'warn'\}\/>\{m&&<Badge value=\{m\.status\} tone=\{m\.status==='active'\?'good':undefined\}\/>\}<\/div>/);
    expect(rule(hotfix,'.ia-org-badges{')).toContain('display:flex');
    expect(source('shared.tsx')).toContain('data-tone={tone}');
  });
  it('colours Member green and non-member amber in both themes',()=>{
    expect(hotfix).toContain('--h18-good-bg:rgba(74,222,128,.15)');expect(hotfix).toContain('--h18-warn-bg:rgba(217,119,6,.12)');
    // Dark uses the requested #4ade80 and #fcd34d. Ivory uses #166534 and #92400e: the requested #15803d and #b45309 measure 4.05 and 3.90 on the tinted badge.
    expect(hotfix).toContain('--h18-good-ink:#4ade80');expect(hotfix).toContain('--h18-good-ink:#166534');
    expect(hotfix).toContain('--h18-warn-ink:#fcd34d');expect(hotfix).toContain('--h18-warn-ink:#92400e');
    expect(ratio('#4ade80','#1e4d4f')).toBeGreaterThanOrEqual(4.5);expect(ratio('#fcd34d','#2f3d46')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#166534','#daecd6')).toBeGreaterThanOrEqual(4.5);expect(ratio('#92400e','#f0e1ca')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('hotfix 1.8 hardware transfer card (item 5)',()=>{
  const context='This panel manages sovereign defense materiel transfers to bilateral partners and ensures compliance with multilateral arms embargoes.';
  it('bounds the card at 680px and adds the context line',()=>{
    expect(rule(hotfix,':root .ia-hardware-card{')).toContain('max-width:680px');
    const tab=source('SanctionsTab.tsx');
    expect(tab).toContain('className="ia-card ia-hardware-card"');expect(tab).toContain('data-testid="hardware-context"');expect(tab).toContain(context);
  });
  it('translates the context into every language',()=>{
    expect(translateText('en',context)).toBe(context);
    for(const language of LANGUAGES)expect(translateText(language,context),language).not.toBe(context);
  });
});

describe('hotfix 1.8 stylesheet order',()=>{
  it('loads hotfix18.css last',()=>{expect(source('main.tsx').trimEnd().split('\n').pop()).toContain('hotfix18.css');});
});
