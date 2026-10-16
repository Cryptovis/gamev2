import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {ORGANIZATION_IDS} from '../domain/organizations';
import {OrganizationEmblem,ORGANIZATION_PALETTE} from '../ui/icons/OrganizationIcons';
import {translateText} from '../i18n/localeText';

const css=import.meta.glob<string>(['../ui/styles/hotfix15.css'],{query:'?raw',import:'default',eager:true});
const sources=import.meta.glob<string>(['../ui/panels/CampaignSetup.tsx','../ui/panels/international/SanctionsTab.tsx','../ui/panels/international/OverviewTab.tsx','../ui/panels/ExecutiveDesk.tsx','../ui/panels/InternationalAffairsWorkspace.tsx','../main.tsx'],{query:'?raw',import:'default',eager:true});
const hotfix=Object.values(css)[0];
const source=(name:string)=>sources[`../ui/panels/${name}`]??sources[`../${name}`];
const TAB_LABELS=[...source('InternationalAffairsWorkspace.tsx').matchAll(/label:'([^']+)'/g)].map(m=>m[1]);
const LANGUAGES=['tr','es','zh','ru'] as const;

const channel=(v:number)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const luminance=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);};
const ratio=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const cssVars=(selector:string)=>{const start=hotfix.indexOf(selector);const open=hotfix.indexOf('{',start);return Object.fromEntries([...hotfix.slice(open+1,hotfix.indexOf('}',open)).matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]?/g)].map(m=>[m[1],m[2].trim()]));};

describe('hotfix 1.5 setup wizard header (item 5)',()=>{
  const setup=source('CampaignSetup.tsx');
  it('shows Rule of Nations as a gold title and drops the poster badge and the version string',()=>{
    expect(setup).toContain('className="wizard-brand"');
    expect(setup).not.toContain('<BrandMark');
    expect(setup).not.toContain('wizard-release');
    expect(setup).not.toContain('package.json');
    expect(setup).not.toMatch(/\{version\}/);
  });
  it('styles the title in gold for Navy and a darker gold for Ivory',()=>{
    expect(hotfix).toMatch(/\.wizard-brand\{[^}]*color:#f0cf72/);
    expect(hotfix).toMatch(/data-theme="light"\][^{]*\.wizard-brand\{[^}]*color:#6f5207/);
    expect(ratio('#6f5207','#f4efe0')).toBeGreaterThan(4.5);
  });
});

describe('hotfix 1.5 nation step (item 6)',()=>{
  const setup=source('CampaignSetup.tsx');
  it('puts the selected leader portrait beside the flag',()=>{
    expect(setup).toMatch(/className="nation-identity"[^]*<AvatarPortrait id=\{avatar\}[^]*nation-flag-hero/);
  });
  it('shows the opening profile as capitalised chips instead of raw lowercase text',()=>{
    expect(setup).toContain('className="opening-chips"');
    for(const label of ['Opening Profile','Sovereign Stance','Dominant Faith'])expect(setup).toContain(`value={"${label}"}`);
    expect(setup).not.toMatch(/value=\{"OPENING PROFILE"\}/);
    expect(hotfix).toMatch(/\.opening-chips li b\{[^}]*text-transform:capitalize/);
  });
  it('translates the chip labels into all four other languages in Title Case',()=>{
    for(const label of ['Opening Profile','Sovereign Stance','Dominant Faith'])for(const language of LANGUAGES){
      const translated=translateText(language,label);
      expect(translated,`${language}: ${label}`).not.toBe(label);
      if(language!=='zh')expect(translated,`${language}: ${label}`).not.toBe(translated.toLocaleUpperCase(language));
    }
    expect(translateText('tr','Opening Profile')).toBe('Başlangıç Profili');
  });
});

describe('hotfix 1.5 Executive Desk (item 7)',()=>{
  it('is capped at 780px and centred',()=>{
    expect(hotfix).toMatch(/#desk-window\.executive-workspace\{[^}]*max-width:780px/);
    expect(hotfix).toMatch(/#desk-window\.executive-workspace\{[^}]*margin-inline:auto/);
  });
  it('centres the empty states inside a bordered panel',()=>{
    expect(hotfix).toMatch(/#desk-window \.desk-empty\{[^}]*text-align:center[^}]*border:1px solid var\(--border\)/);
    expect(source('ExecutiveDesk.tsx')).toContain('No reports in this section yet.');
  });
});

describe('hotfix 1.5 alliance cards (item 8)',()=>{
  it('lays the organization cards out in an equal-height grid with pinned buttons and level titles',()=>{
    expect(hotfix).toMatch(/\.ia-organization-grid\{[^}]*grid-auto-rows:1fr/);
    expect(hotfix).toMatch(/\.ia-organization-grid \.ia-org-title\{[^}]*min-height:calc\(2 \* 1\.25em/);
    expect(hotfix).toMatch(/\.ia-organization-grid \.ia-buttons\{[^}]*margin-top:auto/);
  });
  it('gives every organization its own colour pair, and the named ones the colours asked for',()=>{
    expect(Object.keys(ORGANIZATION_PALETTE).sort()).toEqual([...ORGANIZATION_IDS].sort());
    const pairs=Object.values(ORGANIZATION_PALETTE).map(p=>`${p.disc}|${p.glyph}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    const hue=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(!d)return -1;const h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return Math.round((h*60+360)%360);};
    const P=ORGANIZATION_PALETTE;
    expect(hue(P.csto.disc)).toBeGreaterThan(330);          // crimson
    expect(hue(P.sco.disc)).toBeGreaterThan(140);expect(hue(P.sco.disc)).toBeLessThan(170); // emerald
    expect(hue(P.un.disc)).toBeGreaterThan(190);expect(hue(P.un.disc)).toBeLessThan(205);  // cyan
    expect(hue(P.imf.disc)).toBeGreaterThan(215);expect(hue(P.imf.disc)).toBeLessThan(235); // cobalt
    expect(P.un.glyph).toBe('#ffffff');
    expect(P.opecPlus.glyph).toBe('#0d0d0d');
    for(const id of ['nato','csto','sco','imf','worldBank'] as const)expect(hue(P[id].glyph)).toBeGreaterThan(38);
  });
  it('keeps every glyph readable against its disc',()=>{
    for(const [id,p] of Object.entries(ORGANIZATION_PALETTE))expect(ratio(p.disc,p.glyph),id).toBeGreaterThanOrEqual(3);
  });
  it('renders a filled colour disc for each organization at the old size',()=>{
    for(const id of ORGANIZATION_IDS){
      const html=renderToStaticMarkup(createElement(OrganizationEmblem,{id}));
      expect(html).toContain(`data-emblem="${id}"`);expect(html).toContain('data-colored="true"');expect(html).toContain('width="36"');
      expect(html).toContain(`fill="${ORGANIZATION_PALETTE[id].disc}"`);
    }
  });
});

describe('hotfix 1.5 Title Case and the arms transfer note (item 9)',()=>{
  it('uses Title Case for every section tab',()=>{
    expect(TAB_LABELS).toEqual(['Overview & Roster','Resolutions & Voting','Financial Facilities','Commodities & Swaps','Sanctions & Enforcement']);
  });
  it('titles the hardware section and explains it right under the heading',()=>{
    const sanctions=source('international/SanctionsTab.tsx');
    expect(sanctions).toMatch(/<h3><LocaleText value="Military Hardware Transfer"\/><\/h3><p className="ia-section-note"/);
    expect(sanctions).toContain('Manage sovereign military hardware aid, defense transfers and arms embargo compliance.');
    expect(source('international/OverviewTab.tsx')).toContain('value="Member Roster"');
  });
  it('translates the tabs, the heading and the note into every language',()=>{
    const note='Manage sovereign military hardware aid, defense transfers and arms embargo compliance.';
    for(const key of [...TAB_LABELS,'Military Hardware Transfer','Member Roster','Humanitarian Exemptions',note])for(const language of LANGUAGES)
      expect(translateText(language,key),`${language}: ${key}`).not.toBe(key);
    expect(translateText('en',note)).toBe(note);
  });
});

describe('hotfix 1.5 HUD docks (item 10)',()=>{
  it('replaces the dark navy button with a cream slate in Navy and a polished ivory in Ivory',()=>{
    const navy=cssVars(':root{--dock-bg-top'),ivory=cssVars(':root[data-theme="light"]{--dock-bg-top');
    for(const key of ['--dock-bg-top','--dock-bg-bottom','--dock-ink','--dock-active-bottom'])expect(Object.keys(navy)).toContain(key);
    expect(luminance(navy['--dock-bg-bottom'])).toBeGreaterThan(0.4);
    expect(luminance(ivory['--dock-bg-top'])).toBeGreaterThan(0.85);
  });
  it('keeps the label readable on the lightest and darkest point of the button in both themes',()=>{
    for(const vars of [cssVars(':root{--dock-bg-top'),cssVars(':root[data-theme="light"]{--dock-bg-top')])
      for(const bg of [vars['--dock-bg-top'],vars['--dock-bg-bottom'],vars['--dock-active-top'],vars['--dock-active-bottom']])
        expect(ratio(vars['--dock-ink'],bg)).toBeGreaterThanOrEqual(7);
  });
  it('covers the left, right and map and help rails and is loaded after every other stylesheet',()=>{
    expect(hotfix).toMatch(/\.command-rail \.rail-button\{background:linear-gradient/);
    expect(hotfix).toMatch(/\.map-help-cluster \.rail-button/);
    const main=source('main.tsx');
    expect(main.lastIndexOf('hotfix15.css')).toBeGreaterThan(main.lastIndexOf('playtest130.css'));
    expect(main.trimEnd().split('\n').pop()).toContain('hotfix15.css');
  });
  it('gives forced-colors users system colours',()=>{
    expect(hotfix).toMatch(/forced-colors:active[^]*ButtonFace/);
  });
});
