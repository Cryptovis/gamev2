import {describe,expect,it} from 'vitest';
import {NIGHT_BANDS,angularDistanceDeg,antipode,dayOfYear,equationOfTime,nightFactor,solarDeclination,subsolarPoint} from '../map/solarTerminator';
import {RIVERS,RIVER_FEATURES,smoothRiver} from '../map/riverData';
import {NIGHT_CITIES} from '../map/nightCities';

import {readFileSync} from 'node:fs';

const files=import.meta.glob<string>(['../map/WorldMap.tsx','../map/LivingMapLayers.tsx','../map/solarTerminator.ts','../map/riverData.ts','../map/nightCities.ts','../ui/styles/livingMap095.css','../main.tsx'],{query:'?raw',import:'default',eager:true});
const source=(name:string)=>{
  if(name.endsWith('.css')) return readFileSync(new URL(`../ui/styles/${name}`,import.meta.url),'utf8');
  return Object.entries(files).find(([path])=>path.endsWith('/'+name))![1];
};
const block=(css:string,selector:string)=>{const at=css.indexOf(selector+' {');if(at<0)return '';return css.slice(css.indexOf('{',at)+1,css.indexOf('}',at));};

describe('phase 9.5 solar terminator',()=>{
  it('computes the day of the year from an ISO date',()=>{
    expect(dayOfYear('2026-01-01')).toBe(1);expect(dayOfYear('2026-03-01')).toBe(60);expect(dayOfYear('2026-12-31')).toBe(365);expect(dayOfYear('nonsense')).toBe(1);
  });
  it('puts the declination at the solstices and near zero at the equinoxes',()=>{
    expect(solarDeclination(dayOfYear('2026-06-21'))).toBeGreaterThan(23);
    expect(solarDeclination(dayOfYear('2026-12-21'))).toBeLessThan(-23);
    expect(Math.abs(solarDeclination(dayOfYear('2026-03-20')))).toBeLessThan(1.2);
    expect(Math.abs(solarDeclination(dayOfYear('2026-09-23')))).toBeLessThan(1.2);
  });
  it('keeps the equation of time within sixteen minutes all year',()=>{
    for(let n=1;n<=365;n+=7)expect(Math.abs(equationOfTime(n))).toBeLessThan(17);
  });
  it('moves the subsolar longitude fifteen degrees per hour, westward',()=>{
    const noon=subsolarPoint('2026-03-20',12),three=subsolarPoint('2026-03-20',15);
    expect(Math.abs(noon[0])).toBeLessThan(5);
    expect(Math.round((noon[0]-three[0])*10)/10).toBe(45);
    expect(Math.abs(subsolarPoint('2026-03-20',0)[0])).toBeGreaterThan(170);
    const wrapped=subsolarPoint('2026-03-20',23)[0];expect(wrapped).toBeGreaterThanOrEqual(-180);expect(wrapped).toBeLessThanOrEqual(180);
  });
  it('is a pure function of its inputs',()=>{
    expect(subsolarPoint('2026-07-04',9.5)).toEqual(subsolarPoint('2026-07-04',9.5));
  });
  it('has the antipode exactly opposite the sun',()=>{
    const sun=subsolarPoint('2026-10-17',6),night=antipode(sun);
    expect(Math.abs(angularDistanceDeg(sun,night)-180)).toBeLessThan(1e-6);
    expect(Math.abs(night[1]+sun[1])).toBeLessThan(1e-9);
  });
  it('makes Tokyo dark and London bright at 12:00 UTC',()=>{
    const sun=subsolarPoint('2026-03-20',12),tokyo=NIGHT_CITIES.find(c=>c.id==='Tokyo')!,london=NIGHT_CITIES.find(c=>c.id==='London')!;
    expect(nightFactor(tokyo.position,sun)).toBe(1);expect(nightFactor(london.position,sun)).toBe(0);
  });
  it('fades through twilight instead of switching at the terminator',()=>{
    const sun:[number,number]=[0,0];
    expect(nightFactor([90,0],sun)).toBe(0);expect(Math.abs(nightFactor([96,0],sun)-.5)).toBeLessThan(1e-6);expect(nightFactor([102,0],sun)).toBe(1);
  });
  it('orders the night bands from the wide penumbra inward and straddles the terminator',()=>{
    const radii=NIGHT_BANDS.map(b=>b.radius);
    expect([...radii].sort((a,b)=>b-a)).toEqual(radii);expect(radii).toContain(90);expect(radii[0]).toBeGreaterThan(90);expect(radii.at(-1)).toBeLessThan(90);
  });
});

describe('phase 9.5 river networks',()=>{
  it('carries every river named in the brief',()=>{
    const ids=RIVERS.map(r=>r.id);
    for(const name of ['Danube','Rhine','Nile','Tigris','Euphrates','Amazon','Yangtze','Mississippi','Volga'])expect(ids,name).toContain(name);
  });
  it('keeps every waypoint on Earth and every hop short enough to be a real river reach',()=>{
    for(const river of RIVERS){
      expect(river.points.length,river.id).toBeGreaterThanOrEqual(10);
      river.points.forEach(([lon,lat],i)=>{
        expect(lon).toBeGreaterThanOrEqual(-180);expect(lon).toBeLessThanOrEqual(180);expect(lat).toBeGreaterThanOrEqual(-90);expect(lat).toBeLessThanOrEqual(90);
        if(i>0)expect(angularDistanceDeg(river.points[i-1],[lon,lat]),`${river.id} hop ${i}`).toBeLessThan(5);
      });
    }
  });
  it('puts well-known places on the right rivers',()=>{
    const near=(id:string,at:[number,number],deg=1.2)=>expect(Math.min(...RIVER_FEATURES.find(f=>f.properties.id===id)!.geometry.coordinates.map(p=>angularDistanceDeg(p as [number,number],at))),id).toBeLessThan(deg);
    near('Danube',[19.04,47.5]);near('Danube',[16.38,48.22]);near('Rhine',[6.96,50.94]);near('Nile',[31.25,30.05]);near('Nile',[32.5,15.6]);
    near('Tigris',[44.38,33.3]);near('Euphrates',[44.42,32.48]);near('Amazon',[-60.0,-3.13]);near('Yangtze',[114.3,30.58]);
    near('Mississippi',[-90.18,38.63]);near('Volga',[44.5,48.7]);
  });
  it('flows toward the sea: the first and last points are source and mouth',()=>{
    const nile=RIVERS.find(r=>r.id==='Nile')!;expect(nile.points[0][1]).toBeLessThan(2);expect(nile.points.at(-1)![1]).toBeGreaterThan(31);
    const miss=RIVERS.find(r=>r.id==='Mississippi')!;expect(miss.points[0][1]).toBeGreaterThan(47);expect(miss.points.at(-1)![1]).toBeLessThan(30);
  });
  it('smooths into a denser line that keeps both endpoints',()=>{
    for(const river of RIVERS){
      const line=smoothRiver(river.points);
      expect(line.length).toBeGreaterThan(river.points.length*3);
      expect(line[0]).toEqual(river.points[0]);expect(line.at(-1)).toEqual(river.points.at(-1));
    }
    expect(smoothRiver([[0,0],[1,1]])).toEqual([[0,0],[1,1]]);
  });
  it('builds GeoJSON line features',()=>{
    expect(RIVER_FEATURES).toHaveLength(RIVERS.length);
    for(const f of RIVER_FEATURES)expect(f.geometry.type).toBe('LineString');
  });
});

describe('phase 9.5 city lights',()=>{
  it('includes the cities named in the brief',()=>{
    const ids=NIGHT_CITIES.map(c=>c.id);
    for(const name of ['Istanbul','London','New York','Tokyo','Beijing'])expect(ids,name).toContain(name);
  });
  it('has unique, valid, weighted entries',()=>{
    expect(new Set(NIGHT_CITIES.map(c=>c.id)).size).toBe(NIGHT_CITIES.length);
    for(const c of NIGHT_CITIES){expect(Math.abs(c.position[0])).toBeLessThanOrEqual(180);expect(Math.abs(c.position[1])).toBeLessThanOrEqual(90);expect([1,2,3]).toContain(c.weight);}
  });
});

describe('phase 9.5 map wiring and styling',()=>{
  const map=source('WorldMap.tsx'),layers=source('LivingMapLayers.tsx'),css=source('livingMap095.css');
  it('draws the three layers only over the geographic surface',()=>{
    expect(map).toContain('<ShelfHalo');expect(map).toContain('<RiverLayer');expect(map).toContain('<NightLayer');
    expect(map).toMatch(/photographic&&surfaceReady&&<ShelfHalo/);expect(map).toMatch(/photographic&&surfaceReady&&<>\s*<RiverLayer/);
  });
  it('applies the flat-map pan and zoom transform to the vector layers',()=>{
    expect(map).toContain("const livingTransform=projectionMode==='flat'?flatTransform:undefined");
    expect(map.match(/transform=\{livingTransform\}/g)?.length).toBe(3);
  });
  it('stays presentation-only: no engine or simulation import in the new map modules',()=>{
    for(const name of ['LivingMapLayers.tsx','solarTerminator.ts','riverData.ts','nightCities.ts'])expect(source(name),name).not.toMatch(/from ['"][./]*\/?(engine|simulation)/);
    expect(layers).not.toContain('useGameStore');
  });
  it('never intercepts the pointer and is hidden from assistive technology',()=>{
    expect(layers.match(/pointerEvents="none"/g)?.length).toBeGreaterThanOrEqual(4);expect(layers.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(4);
  });
  it('masks the shelf glow to the sea and keeps its strokes screen-sized',()=>{
    expect(layers).toContain('mask="url(#shelf-sea-mask)"');expect(css).toMatch(/\.shelf-halo\s*\{[^}]*vector-effect: non-scaling-stroke/);
    expect(css).toMatch(/shelf-halo-wide[^}]*stroke-width: 8px/);expect(css).toMatch(/shelf-halo-near[^}]*stroke-width: 3px/);
  });
  it('defines every colour token for both Navy and Ivory',()=>{
    const navy=block(css,':root'),ivory=block(css,':root[data-theme="light"]');
    const names=[...navy.matchAll(/(--[a-z-]+):/g)].map(m=>m[1]);
    expect(names.length).toBeGreaterThanOrEqual(9);
    for(const name of names)expect(ivory,name).toContain(name+':');
  });
  it('turns the Ivory lights into warm sepia dots with a faint glow',()=>{
    const ivory=block(css,':root[data-theme="light"]');
    expect(ivory).toContain('--night-light-core: #e8c48c');
    expect(css).toMatch(/:root\[data-theme="light"\] \.night-light-glow \{ opacity: 0\.55/);
  });
  it('loads the sheet before the hotfix sheets so they keep the last word',()=>{
    const main=source('main.tsx');expect(main.indexOf('livingMap095.css')).toBeGreaterThan(0);expect(main.indexOf('livingMap095.css')).toBeLessThan(main.indexOf('hotfix15.css'));
  });
});
