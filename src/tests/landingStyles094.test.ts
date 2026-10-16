import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(new URL(`../ui/styles/${name}`,import.meta.url),'utf8');
const landing=read('landing094.css'),appearance=read('appearancePhase7.css');
const block=(css:string,opener:string)=>{const start=css.indexOf(opener);if(start<0)return '';const open=css.indexOf('{',start);return css.slice(open+1,css.indexOf('}',open));};

const tokens=(body:string)=>Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const navy={...tokens(block(appearance,':root,[data-theme="dark"]{')),...tokens(block(landing,':root,[data-theme="dark"]{'))};
const ivory={...navy,...tokens(block(appearance,':root[data-theme="light"]{')),...tokens(block(landing,':root[data-theme="light"]{'))};

const channel=(v:number)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const luminance=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);};
const ratio=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};

describe('landing094.css tokens',()=>{
 it('defines the same --l94 tokens for Navy and Ivory',()=>{
  const dark=Object.keys(tokens(block(landing,':root,[data-theme="dark"]{'))).sort();
  const light=Object.keys(tokens(block(landing,':root[data-theme="light"]{'))).sort();
  expect(dark.length).toBeGreaterThan(8);
  // The font stack is theme-neutral and only declared once.
  expect(light).toEqual(dark.filter(name=>name!=='--l94-sans'));
 });
 it('uses the documented Navy surface and Ivory overrides',()=>{
  expect(navy['--surface']).toBe('#0e2035');expect(navy['--l94-gold']).toBe('#d4af37');
  expect(ivory['--surface']).toBe('#fffdf7');expect(ivory['--l94-gold']).not.toBe(navy['--l94-gold']);
 });
 it('only references tokens that exist',()=>{
  const defined=new Set(Object.keys(ivory));
  for(const [,name] of landing.matchAll(/var\((--[\w-]+)/g))expect(defined.has(name),name).toBe(true);
 });
 it('never writes a font shorthand with inherit as the family, which would invalidate the declaration',()=>{
  expect(/font\s*:[^;}]*\binherit\b/.test(landing)).toBe(false);
 });
});

describe('landing094.css contrast',()=>{
 const textPairs:[string,string,string][]=[
  ['--ink','--surface','ink on surface'],['--ink','--surface-inset','ink on page'],['--ink-muted','--surface-inset','muted on page'],
  ['--ink-muted','--surface','muted on surface'],['--ink-muted','--surface-raised','muted on raised'],
  ['--l94-gold-text','--surface-inset','gold text on page'],['--l94-gold-text','--surface','gold text on surface'],['--l94-gold-text','--surface-raised','gold text on raised'],
  ['--l94-warn','--surface','warning on surface'],['--l94-cta-ink','--l94-cta-bg','button text'],['--l94-cta-ink','--l94-cta-bg-hover','button text on hover'],
 ];
 for(const [theme,map] of [['Navy',navy],['Ivory',ivory]] as const){
  it(`keeps every ${theme} text pair at 4.5:1 or better`,()=>{
   for(const [fg,bg,label] of textPairs)expect(ratio(map[fg],map[bg]),`${theme} ${label}`).toBeGreaterThanOrEqual(4.5);
  });
  it(`keeps ${theme} outlines, focus ring and gold hairlines at 3:1 or better against the page`,()=>{
   for(const name of ['--l94-border','--focus','--l94-gold'])expect(ratio(map[name],map['--surface-inset']),`${theme} ${name}`).toBeGreaterThanOrEqual(3);
  });
 }
});

describe('landing094.css responsive and accessibility rules',()=>{
 it('has the three width breakpoints, reduced motion and forced colors',()=>{
  for(const query of ['(max-width:1023px)','(max-width:719px)','(max-width:479px)','(prefers-reduced-motion:reduce)','(forced-colors:active)'])expect(landing.includes(query),query).toBe(true);
 });
 it('keeps controls at least 44px tall',()=>{
  for(const selector of ['.l94-dock-btn{','.l94-cta{','.l94-action-card{'])expect(landing.slice(landing.indexOf(selector)).split('}')[0],selector).toMatch(/min-height:(44|56|120)px/);
 });
});
