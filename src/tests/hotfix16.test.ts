import {describe,expect,it} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {executeCommandResult} from '../engine/commands';
import {commandReceipt} from '../store/commandReceipt';
import {translateText} from '../i18n/localeText';
import {daysInOffice} from '../ui/hud/daysInOffice';
import {quoteSizeBucket} from '../ui/components/LeadershipWisdomWidget';

const css=import.meta.glob<string>(['../ui/styles/hotfix16.css','../ui/styles/landing094.css'],{query:'?raw',import:'default',eager:true});
const sources=import.meta.glob<string>(['../ui/panels/DiplomaticPost.tsx','../ui/panels/ReviewDialog.tsx','../ui/panels/TargetCountryModal.tsx','../ui/hud/TopBar.tsx','../ui/panels/landing/ProfileDrawer.tsx','../main.tsx'],{query:'?raw',import:'default',eager:true});
const hotfix=css['../ui/styles/hotfix16.css'],landing=css['../ui/styles/landing094.css'];
const source=(name:string)=>sources[`../ui/panels/${name}`]??sources[`../ui/hud/${name}`]??sources[`../${name}`];
const LANGUAGES=['tr','es','zh','ru'] as const;

const channel=(v:number)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const luminance=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);};
const ratio=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const rule=(sheet:string,opener:string)=>{const start=sheet.indexOf(opener);if(start<0)return '';const open=sheet.indexOf('{',start);return sheet.slice(open+1,sheet.indexOf('}',open));};

describe('hotfix 1.6 action cards and artwork (items 1, 2, 4)',()=>{
  it('maps each card to its artwork file',()=>{
    expect(landing).toContain('url("/assets/command/card-new-campaign.jpg")');
    expect(landing).toContain('url("/assets/command/card-scenarios.jpg")');
    expect(landing).toContain('url("/assets/command/card-profile.jpg")');
  });
  it('mutes the artwork at rest and brings it to full colour with a lift and a gold glow on hover and focus',()=>{
    const rest=rule(landing,'.l94-card-art{');
    expect(rest).toMatch(/opacity:\.75/);expect(rest).toMatch(/grayscale\(25%\)/);expect(rest).toMatch(/brightness\(\.85\)/);
    const hover=rule(landing,'.l94-action-card:hover .l94-card-art');
    expect(hover).toMatch(/opacity:1/);expect(hover).toMatch(/filter:none/);expect(hover).toMatch(/scale\(1\.07\)/);
    const lift=rule(landing,'.l94-action-card:hover:not(:disabled)');
    expect(lift).toMatch(/translateY\(-4px\)/);expect(lift).toMatch(/box-shadow:var\(--l94-card-glow\)/);
    expect(landing).toMatch(/--l94-card-glow:[^;]*rgba\(212,175,55/);
  });
  it('lays the four cards out in one row of equal height and steps down to two columns and one',()=>{
    expect(rule(landing,'.l94-action-cards{')).toMatch(/repeat\(4,minmax\(0,1fr\)\)/);
    expect(rule(landing,'.l94-action-cards{')).toMatch(/align-items:stretch/);
    expect(landing).toMatch(/max-width:1023px\)\{[^]*\.l94-action-cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
    expect(landing).toMatch(/max-width:479px\)\{[^]*\.l94-action-cards\{grid-template-columns:minmax\(0,1fr\)\}/);
  });
  it('keeps card text on a near-opaque base so the artwork never costs contrast, in both themes',()=>{
    expect(landing).toMatch(/\.l94-action-card::after\{[^}]*var\(--l94-scrim\) 0,var\(--l94-scrim\) 40%/);
    const darkScrim=landing.match(/--l94-scrim:rgba\((\d+),(\d+),(\d+),\.9\d\)/)!;
    const hex=(r:string,g:string,b:string)=>'#'+[r,g,b].map(n=>Number(n).toString(16).padStart(2,'0')).join('');
    expect(ratio('#e9eef4',hex(darkScrim[1],darkScrim[2],darkScrim[3]))).toBeGreaterThan(12);
    expect(ratio('#142c46','#fffbf0')).toBeGreaterThan(12);
  });
  it('words the cards in plain English and in all five languages',()=>{
    expect(translateText('en','Player Profile')).toBe('Player Profile');
    const names={tr:'Oyuncu Profili',es:'Perfil de Jugador',zh:'玩家档案',ru:'Профиль Игрока'} as const;
    for(const language of LANGUAGES){
      expect(translateText(language,'Player Profile'),language).toBe(names[language]);
      expect(translateText(language,'Manage profile, cloud sync and saves'),language).not.toBe('Manage profile, cloud sync and saves');
    }
  });
});

describe('hotfix 1.6 footer and quote frame (items 3, 5)',()=>{
  it('centres the footer notes',()=>{
    const footer=rule(landing,'.l94-footer{');
    expect(footer).toMatch(/justify-items:center/);expect(footer).toMatch(/text-align:center/);
    expect(translateText('tr','All rights reserved.')).toBe('Tüm hakları saklıdır.');
    for(const language of LANGUAGES)expect(translateText(language,'All rights reserved.'),language).not.toBe('All rights reserved.');
  });
  it('frames the quote in a centred translucent box with no left rule and a fixed height',()=>{
    const hero=rule(landing,'.lw--hero{');
    expect(hero).toMatch(/margin:clamp\(8px,3vh,30px\) auto 0/);
    expect(hero).toMatch(/height:var\(--lw-h\)/);expect(hero).toMatch(/overflow:hidden/);expect(hero).toMatch(/border-radius:8px/);
    expect(hero).toMatch(/border:1px solid var\(--l94-quote-line\)/);expect(hero).not.toMatch(/border-left/);
    expect(landing).toContain('--l94-quote-line:rgba(212,175,55,.25)');
    expect(landing).toMatch(/--l94-quote-bg:rgba\(14,32,53,\.72\)/);
  });
  it('shrinks the type for longer quotes instead of growing the box',()=>{
    expect(quoteSizeBucket('Short.','en')).toBe('s');
    expect(quoteSizeBucket('x'.repeat(120),'en')).toBe('m');
    expect(quoteSizeBucket('x'.repeat(200),'en')).toBe('l');
    expect(quoteSizeBucket('x'.repeat(400),'en')).toBe('xl');
    expect(quoteSizeBucket('x'.repeat(60),'zh')).toBe('m');
    const size=(bucket:string)=>Number(landing.match(new RegExp(`\\.lw--hero\\[data-size="${bucket}"\\] \\.lw-text\\{font-size:([\\d.]+)px`))![1]);
    expect(size('s')).toBeGreaterThan(size('m'));expect(size('m')).toBeGreaterThan(size('l'));expect(size('l')).toBeGreaterThan(size('xl'));
  });
});

describe('hotfix 1.6 header and sign-in (item 6)',()=>{
  it('offers Google, Apple and Facebook in the drawer with a localized label, and no social button elsewhere',()=>{
    const drawer=source('landing/ProfileDrawer.tsx');
    for(const provider of ['google','apple','facebook'])expect(drawer).toContain(`id:'${provider}'`);
    expect(drawer).toContain('role="status"');expect(drawer).toContain("t('Coming soon')");
    for(const key of ['Continue with Google','Continue with Apple','Continue with Facebook','Or sign in with'])
      for(const language of LANGUAGES)expect(translateText(language,key),`${language}: ${key}`).not.toBe(key);
    for(const language of LANGUAGES)expect(translateText(language,'Coming soon'),language).not.toBe('Coming soon');
  });
});

describe('hotfix 1.6 tutorial button on Ivory (item 7)',()=>{
  it('sets dark executive navy on gold with bold weight, above 7:1 enabled and waiting',()=>{
    expect(hotfix).toMatch(/data-theme="light"\] \.tutorial-dialog button\.primary,[^{]*\{color:#0e2035!important\}/);
    expect(hotfix).toMatch(/button\.primary\{background:#e8c25a!important[^}]*font-weight:800/);
    expect(ratio('#0e2035','#e8c25a')).toBeGreaterThanOrEqual(7);
    expect(hotfix).toMatch(/button\.primary:disabled\{opacity:1;background:#ece2c4/);
    expect(ratio('#0e2035','#ece2c4')).toBeGreaterThanOrEqual(7);
  });
});

describe('hotfix 1.6 Diplomatic Inbox (item 8)',()=>{
  it('is capped at 820px and centred',()=>{
    expect(hotfix).toMatch(/#diplomacy-window\.executive-workspace\{[^}]*max-width:820px/);
    expect(hotfix).toMatch(/#diplomacy-window\.executive-workspace\{[^}]*margin-inline:auto/);
  });
  it('shows the assessment as rows, with no frame around the text and the colours from the brief',()=>{
    const post=source('DiplomaticPost.tsx');
    for(const row of ['relations','trade','acceptance'])expect(post).toContain(`data-row="${row}"`);
    for(const label of ['Relations score','Trade eligibility','Acceptance chance'])expect(post).toContain(`value="${label}"`);
    expect(post).toContain('<dl className="assessment-list"');
    expect(hotfix).toMatch(/\.proposal-assessment\{[^}]*border:0!important/);
    expect(hotfix).toContain('--tone-good:#4ade80;--tone-bad:#f87171');
    expect(hotfix).toContain('--tone-good:#166534;--tone-bad:#991b1b');
    expect(ratio('#166534','#f3efe5')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#991b1b','#f3efe5')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#4ade80','#1b2f3b')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#f87171','#1b2f3b')).toBeGreaterThanOrEqual(4.5);
  });
  it('translates the row labels',()=>{
    for(const key of ['Relations score','Trade eligibility','Acceptance chance','Eligible','Points needed'])
      for(const language of LANGUAGES)expect(translateText(language,key),`${language}: ${key}`).not.toBe(key);
  });
});

describe('hotfix 1.6 covert operation briefing (item 9)',()=>{
  const launch=(operationType:'gather_intelligence'|'sabotage_industry')=>{
    const before=makeInitialState(),p=before.countries[before.playerCountryId];
    before.countries[p.id]={...p,economy:{...p.economy,treasury:500}};
    const target=Object.keys(before.countries).find(id=>id!==before.playerCountryId)!;
    const command={type:'intelligence/launch' as const,operationType,targetCountryId:target};
    const result=executeCommandResult(before,command);
    return {before,target,result,receipt:commandReceipt(before,command,result)};
  };
  it('replaces the generic picture with the espionage photograph in a compact briefing',()=>{
    const {receipt,before,target}=launch('gather_intelligence');
    expect(receipt.image).toBe('/assets/command/intel-espionage.jpg');expect(receipt.briefing).toBe(true);
    expect(receipt.title).toBe('Intelligence Briefing');
    expect(receipt.metrics!.slice(0,5).map(m=>m[0])).toEqual(['Target Nation','Operation Type','Risk Level','Estimated Intel Yield','Budget Cost']);
    expect(receipt.metrics![0][1]).toBe(before.countries[target].name);
    expect(receipt.metrics![1][1]).toBe('Gather Intelligence');
  });
  it('reports the budget the engine actually took, not a copy of its price table',()=>{
    const {receipt,before,result}=launch('gather_intelligence');
    const spent=before.countries[before.playerCountryId].economy.treasury-result.state.countries[before.playerCountryId].economy.treasury;
    expect(spent).toBeGreaterThan(0);
    expect(receipt.metrics![4][1]).toContain(String(Math.round(spent)));
  });
  it('rates sabotage as a higher risk than gathering intelligence and tones it red',()=>{
    const gather=launch('gather_intelligence').receipt,sabotage=launch('sabotage_industry').receipt;
    expect(gather.metrics![2][1]).toBe('Low');expect(sabotage.metrics![2][1]).toBe('High');
    expect(sabotage.metricTones!['Risk Level']).toBe('negative');expect(gather.metricTones!['Risk Level']).toBe('positive');
  });
  it('leaves every other receipt as it was',()=>{
    const s=makeInitialState();
    const receipt=commandReceipt(s,{type:'diplomacy/improveRelations',targetCountryId:Object.keys(s.countries).find(id=>id!==s.playerCountryId)!} as never,{status:'applied',state:s,message:'ok'} as never);
    expect(receipt.image).toBeUndefined();expect(receipt.briefing).toBeUndefined();
  });
  it('draws the photograph and caps the dialog at 600px',()=>{
    expect(source('ReviewDialog.tsx')).toContain('review-photo');
    expect(hotfix).toMatch(/\.review-dialog\.review-briefing\{[^}]*max-width:600px/);
  });
  it('translates the briefing labels',()=>{
    for(const key of ['Intelligence Briefing','Target Nation','Operation Type','Risk Level','Estimated Intel Yield','Budget Cost','Low'])
      for(const language of LANGUAGES)expect(translateText(language,key),`${language}: ${key}`).not.toBe(key);
  });
});

describe('hotfix 1.6 Country Info (item 10)',()=>{
  it('is capped at 760px and centred, only for the dossier view',()=>{
    expect(hotfix).toMatch(/\.target-hub\[data-view="dossier"\]\{[^}]*max-width:760px[^}]*margin-inline:auto/);
    expect(source('TargetCountryModal.tsx')).toContain('data-view={view}');
  });
});

describe('hotfix 1.6 commander capsule (item 11)',()=>{
  it('words the tenure badge in each language',()=>{
    expect(daysInOffice('en',45)).toBe('Days in Office: 45');
    expect(daysInOffice('tr',45)).toBe('Görevde 45. Gün');
    expect(daysInOffice('es',45)).toBe('Días en el Cargo: 45');
    expect(daysInOffice('zh',45)).toBe('执政天数: 45');
    expect(daysInOffice('ru',45)).toBe('Дней в Должности: 45');
  });
  it('uses the badge in the top bar and frames the portrait in gold in both themes',()=>{
    expect(source('TopBar.tsx')).toContain('daysInOffice(lang,day)');
    expect(hotfix).toMatch(/\.leader-avatar-button\{[^}]*border:2px solid var\(--cap-gold\)/);
    expect(hotfix).toContain('--cap-gold:#d4af37');expect(hotfix).toContain('--cap-gold:#9a7412');
    expect(hotfix).toMatch(/\.brand-line>strong\{[^}]*font:700 clamp\(16px,1\.3vw,19px\)/);
  });
  it('keeps the badge readable on both themes',()=>{
    expect(ratio('#f3dd9a','#243a4c')).toBeGreaterThanOrEqual(7);
    expect(ratio('#473403','#f3efe5')).toBeGreaterThanOrEqual(7);
  });
});

describe('hotfix 1.6 stylesheet order',()=>{
  it('loads hotfix16.css last',()=>{
    const main=source('main.tsx');
    expect(main.trimEnd().split('\n').pop()).toContain('hotfix16.css');
    expect(main.lastIndexOf('hotfix16.css')).toBeGreaterThan(main.lastIndexOf('hotfix15.css'));
  });
});
