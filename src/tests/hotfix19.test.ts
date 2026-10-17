import {describe,expect,it} from 'vitest';
import {translateText} from '../i18n/localeText';
import {MENU_WORDING} from '../ui/panels/playerMenuWording';

import {readFileSync} from 'node:fs';

const read=(rel:string)=>readFileSync(new URL(rel,import.meta.url),'utf8');
const hotfix=read('../ui/styles/hotfix19.css');
const previous=read('../ui/styles/hotfix18.css');
const sources=import.meta.glob<string>(['../ui/panels/PlayerOptionsMenu.tsx','../ui/panels/CampaignSetup.tsx','../ui/hud/TopBar.tsx','../main.tsx'],{query:'?raw',import:'default',eager:true});
const picker=import.meta.glob<string>(['../ui/panels/Avatar*.tsx'],{query:'?raw',import:'default',eager:true});
const source=(name:string)=>{
  if(name==='main.tsx') return read(`../${name}`);
  if(name==='TopBar.tsx') return read(`../ui/hud/${name}`);
  return read(`../ui/panels/${name}`);
};
const rule=(sheet:string,selector:string)=>{const at=sheet.indexOf(selector);if(at<0)return '';const open=sheet.indexOf('{',at);return sheet.slice(open+1,sheet.indexOf('}',open));};
const channel=(v:number)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const luminance=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);};
const ratio=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const LANGUAGES=['tr','es','zh','ru'] as const;

describe('hotfix 1.9 Chinese ideology (task 1)',()=>{
  it('translates IDEOLOGY as 意识形态, not Islamism',()=>{
    expect(translateText('zh','IDEOLOGY')).toBe('意识形态');
    expect(translateText('zh','Ideology')).toBe('意识形态');
  });
});

describe('hotfix 1.9 orphaned portrait picker (task 2)',()=>{
  it('is gone and nothing imports it',()=>{
    expect(Object.keys(picker)).toHaveLength(0);
    for(const name of ['PlayerOptionsMenu.tsx','CampaignSetup.tsx','TopBar.tsx'])expect(source(name),name).not.toContain('AvatarPicker');
  });
});

describe('hotfix 1.9 National Command tabs (task 3)',()=>{
  const menu=source('PlayerOptionsMenu.tsx');
  it('renders the five tabs in order from the local wording table',()=>{
    expect(menu).toContain("(['profile','history','settings','audio','session'] as MenuTab[])");
    expect(menu).toContain('{menu.tabs[tab]}');expect(menu).not.toMatch(/data-tab=\{tab\}[^>]*><LocaleText/);
    expect(Object.keys(MENU_WORDING.en.tabs)).toEqual(['profile','history','settings','audio','session']);
  });
  it('labels the second tab Campaign in all five languages',()=>{
    expect(MENU_WORDING.en.tabs.history).toBe('Campaign');
    expect(MENU_WORDING.tr.tabs.history).toBe('Kampanya');expect(MENU_WORDING.es.tabs.history).toBe('Campaña');
    expect(MENU_WORDING.zh.tabs.history).toBe('战役');expect(MENU_WORDING.ru.tabs.history).toBe('Кампания');
  });
  it('has distinct, non-empty wording for every language',()=>{
    for(const language of ['en',...LANGUAGES] as const){
      const w=MENU_WORDING[language];
      for(const value of [...Object.values(w.tabs),w.day,w.speed,w.treasury,w.gdp,w.paused])expect(value.length,language).toBeGreaterThan(1);
    }
    for(const language of LANGUAGES){
      const w=MENU_WORDING[language];
      for(const key of ['day','speed','treasury','paused'] as const)expect(w[key],`${language}.${key}`).not.toBe(MENU_WORDING.en[key]);
    }
    expect(MENU_WORDING.zh.treasury).toBe('国库');expect(MENU_WORDING.ru.treasury).toBe('Казна');
  });
  it('lays the tabs in five equal columns that never wrap',()=>{
    expect(rule(hotfix,':root .player-options-modal .profile-tabs{')).toContain('grid-template-columns:repeat(5,minmax(0,1fr))');
    const button=rule(hotfix,':root .player-options-modal .profile-tabs button{');
    expect(button).toContain('white-space:nowrap');expect(button).toContain('text-overflow:ellipsis');expect(button).toContain('min-width:0');
  });
});

describe('hotfix 1.9 status boxes (task 3)',()=>{
  const menu=source('PlayerOptionsMenu.tsx');
  it('shows Days in Office, Simulation Speed, Treasury and GDP',()=>{
    for(const key of ['day','speed','treasury','gdp'])expect(menu).toContain(`data-status="${key}"`);
    expect(menu).toContain('{menu.day}');expect(menu).toContain('{menu.speed}');expect(menu).toContain('{menu.treasury}');expect(menu).toContain('{menu.gdp}');
    expect(MENU_WORDING.en.day).toBe('Days in Office');expect(MENU_WORDING.en.speed).toBe('Simulation Speed');
  });
  it('aligns them as a two by two grid of equal boxes',()=>{
    const grid=rule(hotfix,':root .player-options-modal .campaign-status-grid{');
    expect(grid).toContain('repeat(2,minmax(0,1fr))');expect(grid).toContain('grid-auto-rows:1fr');
    const box=rule(hotfix,':root .player-options-modal .campaign-status-grid>span{');
    expect(box).toContain('align-items:center');expect(box).toContain('min-height:60px');expect(box).toContain('!important');
  });
  it('keeps label, value and icon readable on both themes',()=>{
    expect(ratio('#c3d3e0','#1b3248')).toBeGreaterThanOrEqual(7);expect(ratio('#eef3f8','#1b3248')).toBeGreaterThanOrEqual(7);expect(ratio('#f0cf72','#1b3248')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#465b70','#f3efe5')).toBeGreaterThanOrEqual(5.5);expect(ratio('#142c46','#f3efe5')).toBeGreaterThanOrEqual(7);expect(ratio('#7a5a08','#f3efe5')).toBeGreaterThanOrEqual(4.5);
    expect(hotfix).toContain('--h19-box-bg:#1b3248');expect(hotfix).toContain('--h19-box-bg:#f3efe5');
  });
});

describe('hotfix 1.9 hardware card (task 4)',()=>{
  it('stays within 680px and never forces sideways scrolling',()=>{
    expect(previous).toMatch(/\.ia-hardware-card\{width:100%;max-width:680px/);
    const card=rule(hotfix,':root .ia-hardware-card{');
    expect(card).toContain('max-width:min(680px,100%)');expect(card).toContain('min-width:0');expect(card).toContain('box-sizing:border-box');
    expect(hotfix).toMatch(/\.ia-section-context,h3\)\{overflow-wrap:anywhere/);
    expect(hotfix).toMatch(/\.ia-hardware-card :is\(select,input\)\{max-width:100%/);
  });
});

describe('hotfix 1.9 stylesheet order',()=>{
  it('loads hotfix19.css last',()=>{expect(source('main.tsx').trimEnd().split('\n').pop()).toContain('hotfix19.css');});
});
