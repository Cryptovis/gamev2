import {describe,expect,it} from 'vitest';
import {translateText} from '../i18n/localeText';
import {capCommanderName,COMMANDER_NAME_LIMIT,daysInOffice} from '../ui/hud/daysInOffice';

import {readFileSync} from 'node:fs';

const read=(rel:string)=>readFileSync(new URL(rel,import.meta.url),'utf8');
const hotfix=read('../ui/styles/hotfix17.css');
const landing=read('../ui/styles/landing094.css');
const source=(name:string)=>{
  if(name==='TopBar.tsx') return read(`../ui/hud/${name}`);
  if(name==='main.tsx') return read(`../${name}`);
  return read(`../ui/panels/landing/${name}`);
};
const rule=(sheet:string,selector:string)=>{const at=sheet.indexOf(selector);if(at<0)return '';const open=sheet.indexOf('{',at);return sheet.slice(open+1,sheet.indexOf('}',open));};
const channel=(v:number)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const luminance=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);};
const ratio=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const LANGUAGES=['tr','es','zh','ru'] as const;

describe('hotfix 1.7 landing header (item 1)',()=>{
  it('has only the title, the gold rule and the tagline, all centred',()=>{
    const brand=source('HeroBrand.tsx');
    expect(brand).not.toContain('l94-eyebrow');expect(brand).not.toContain('l94-version');expect(brand).not.toContain('BRAND_SHORT');
    expect(landing).toMatch(/\.l94-hero\{[^}]*justify-items:center;text-align:center/);
    expect(landing).toMatch(/\.l94-hero-brand\{[^}]*justify-items:center/);
    expect(landing).not.toContain('.l94-eyebrow{');expect(landing).not.toContain('.l94-version{');
  });
  it('puts three equal cards in a row and the resume bar full width underneath',()=>{
    expect(landing).toMatch(/\.l94-action-cards\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
    expect(landing).toMatch(/\.l94-resume\{width:100%/);
    expect(landing).toMatch(/\.l94-resume>\.l94-card\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
    expect(source('CommandMenu.tsx')).toMatch(/<\/ul>\s*\{lead&&<div className="l94-resume">/);
    expect(source('CommandMenu.tsx')).not.toContain('l94-deck-slot');
  });
  it('titles the bar Continue with Last Saved Campaign in all five languages',()=>{
    expect(source('SaveGameCard.tsx')).toContain("t('Continue with Last Saved Campaign')");
    const key='Continue with Last Saved Campaign';
    expect(translateText('en',key)).toBe(key);
    for(const language of LANGUAGES)expect(translateText(language,key),language).not.toBe(key);
    expect(translateText('tr',key)).toBe('Son Kaydedilen Kampanyayla Devam Et');
  });
  it('stacks the bar on phones',()=>{
    expect(landing).toMatch(/@media \(max-width:719px\)[^]*\.l94-resume>\.l94-card\{grid-template-columns:minmax\(0,1fr\)/);
  });
});

describe('hotfix 1.7 setup wizard (item 2)',()=>{
  it('draws a graticule and vignette behind the wizard in both themes, not a flat fill',()=>{
    const dark=rule(hotfix,':root .campaign-wizard-backdrop{'),light=rule(hotfix,':root[data-theme="light"] .campaign-wizard-backdrop{');
    for(const body of [dark,light]){expect(body).toContain('repeating-linear-gradient(0deg');expect(body).toContain('repeating-linear-gradient(90deg');expect(body).toContain('repeating-radial-gradient');expect(body).toContain('radial-gradient(ellipse');expect(body).toContain('!important');}
    expect(dark).toContain('background-color:var(--h17-base)');
    expect(luminance('#f1ecdd')).toBeGreaterThan(0.8);expect(luminance('#0a1625')).toBeLessThan(0.02);
  });
  it('gives every step the 34 / 66 split Step 2 uses',()=>{
    expect(hotfix).toMatch(/@media \(min-width:761px\)\{\s*:root \.campaign-wizard-backdrop \.campaign-wizard,:root \.campaign-wizard-backdrop \.campaign-wizard\[data-step\]\{grid-template-columns:minmax\(0,34fr\) minmax\(0,66fr\)\}/);
  });
});

describe('hotfix 1.7 tutorial button on Ivory (item 3)',()=>{
  it('forces dark navy, weight 700, in every state and on every tutorial surface',()=>{
    const head=hotfix.slice(hotfix.indexOf(':root[data-theme="light"] .tutorial-dialog button.primary,'));
    const selectors=head.slice(0,head.indexOf('{'));
    for(const part of ['.tutorial-dialog.feature-tour button.primary','.tutorial-dialog.guided-card button.primary','button.primary:is(:hover,:focus,:focus-visible,:active,:disabled)','button.primary *'])expect(selectors,part).toContain(part);
    const body=head.slice(head.indexOf('{')+1,head.indexOf('}'));
    expect(body).toContain('color:#0e2035!important');expect(body).toContain('-webkit-text-fill-color:#0e2035!important');expect(body).toContain('font-weight:700!important');
  });
  it('keeps the contrast at AAA on the button and on its waiting state',()=>{
    expect(ratio('#0e2035','#e8c25a')).toBeGreaterThanOrEqual(7);
    expect(ratio('#0e2035','#f0cf72')).toBeGreaterThanOrEqual(7);
    expect(ratio('#0e2035','#ece2c4')).toBeGreaterThanOrEqual(7);
  });
});

describe('hotfix 1.7 capsule and clock (item 4)',()=>{
  const top=source('TopBar.tsx');
  it('moves Days in Office from the capsule to the clock, under the date',()=>{
    expect(top).not.toContain('day-chip');
    expect(top).toMatch(/<div className="campaign-clock">[^]*gameDate\(useGameStore\.getState\(\)\)\}\/><\/strong><span className="days-in-office" data-testid="days-in-office">\{daysInOffice\(lang,day\)\}<\/span><\/div>/);
    expect(top).toMatch(/<div className="brand-block"><div className="brand-line"><strong[^>]*>[^<]*<LocaleText value=\{capCommanderName\(profile\.commanderName\)\}\/><\/strong><\/div><\/div>/);
  });
  it('keeps the date on a strong element so the date locators still find only the date',()=>{
    expect(top.match(/campaign-clock"><small>/g)).toHaveLength(1);
  });
  it('wraps the line under the date at one step smaller, readable in both themes',()=>{
    const body=rule(hotfix,'.campaign-clock .days-in-office{');
    expect(body).toContain('flex:1 0 100%');expect(body).toContain('text-align:center');
    expect(body).toMatch(/font:600 11\.5px/);
    expect(hotfix).toMatch(/\.campaign-clock strong\{font-size:13px\}/);
    expect(ratio('#e6d9b8','#0e2035')).toBeGreaterThanOrEqual(7);
    expect(ratio('#142c46','#f3efe5')).toBeGreaterThanOrEqual(7);
  });
  it('hugs the portrait and name, with a gold trim on the name',()=>{
    expect(hotfix).toMatch(/\.leader-capsule\{width:max-content/);
    const name=rule(hotfix,'.leader-capsule .brand-line>strong{');
    expect(name).toContain('Georgia');expect(name).toContain('text-overflow:ellipsis');expect(name).toContain('max-width:20ch');expect(name).toContain('text-shadow');
  });
  it('shows the first 20 characters and an ellipsis after that',()=>{
    expect(COMMANDER_NAME_LIMIT).toBe(20);
    expect(capCommanderName('Alper')).toBe('Alper');
    expect(capCommanderName('12345678901234567890')).toBe('12345678901234567890');
    expect(capCommanderName('123456789012345678901')).toBe('12345678901234567890…');
    expect(capCommanderName('  Alexander Hamilton-Washington III ')).toBe('Alexander Hamilton-W…');
    expect(Array.from(capCommanderName('字'.repeat(30))).length).toBe(21);
    expect(capCommanderName('😀'.repeat(25))).toBe('😀'.repeat(20)+'…');
  });
  it('still words the tenure line in all five languages',()=>{
    expect(daysInOffice('en',3)).toBe('Days in Office: 3');expect(daysInOffice('tr',3)).toBe('Görevde 3. Gün');expect(daysInOffice('es',3)).toBe('Días en el Cargo: 3');
    expect(daysInOffice('zh',3)).toBe('执政天数: 3');expect(daysInOffice('ru',3)).toBe('Дней в Должности: 3');
  });
});

describe('hotfix 1.7 Diplomatic Hub icons (item 5)',()=>{
  it('removes the oval clip, border and disc behind the artwork',()=>{
    const body=rule(hotfix,':root .hub-card .hub-card-art,');
    expect(body).toContain('border-radius:0');expect(body).toContain('border:0');expect(body).toContain('background:transparent');expect(body).toContain('overflow:visible');
    expect(body).not.toContain('50%');
  });
});

describe('hotfix 1.7 National Command header and rails (item 6)',()=>{
  it('makes the header solid and opaque in both themes',()=>{
    expect(hotfix).toMatch(/#country-section-window :is\(\.executive-header,\.floating-command-header,\.command-window-header\)/);
    expect(hotfix).toMatch(/background:var\(--h17-header-bg\)!important;background-image:none!important/);
    expect(hotfix).toContain('--h17-header-bg:#182e46');expect(hotfix).toContain('--h17-header-bg:#f3efe5');
    expect(hotfix).toMatch(/backdrop-filter:none!important/);
    expect(ratio('#eef3f8','#182e46')).toBeGreaterThanOrEqual(7);expect(ratio('#142c46','#f3efe5')).toBeGreaterThanOrEqual(7);
  });
  it('clears every background from the left rail, the right rail and the map cluster, with no pseudo-element bands',()=>{
    const head=hotfix.slice(hotfix.indexOf(':root :is(.command-rail,.command-rail-left,.command-rail-right,.command-rail.map-help-cluster),'));
    const selectors=head.slice(0,head.indexOf('{'));
    for(const part of ['.command-rail-left','.command-rail-right','.map-help-cluster)::before','.map-help-cluster)::after'])expect(selectors,part).toContain(part);
    const body=head.slice(head.indexOf('{')+1,head.indexOf('}'));
    for(const decl of ['background:transparent!important','border:0!important','box-shadow:none!important','backdrop-filter:none!important','padding:0!important'])expect(body,decl).toContain(decl);
    expect(hotfix).toMatch(/::after\{content:none!important;display:none!important\}/);
  });
});

describe('hotfix 1.7 stylesheet order',()=>{
  it('loads hotfix17.css before hotfix18.css',()=>{
    const main=source('main.tsx');
    expect(main.lastIndexOf('hotfix18.css')).toBeGreaterThan(main.lastIndexOf('hotfix17.css'));
  });
});
