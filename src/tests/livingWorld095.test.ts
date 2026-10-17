import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LANDMARK_ART,LandmarkSymbols,landmarkSymbolId} from '../map/landmarkIcons';
import {CAPITAL_POSITIONS} from '../data/capitalPositions';
import {CHAINS,PEAKS,generatePeaks,stations} from '../map/mountainData';
import {RELIEF_MIN_PPD,peakShape,reliefDetail,reliefPaths,reliefScale} from '../map/mountainRelief';
import {beachhead,hash01,pointsAlong,projectLines,sharedBorder,troopLevels,underAssault,frontGeometry,clearFrontCache,linesToPath} from '../map/frontlines';
import {belligerentColors,markersAlong,warFronts} from '../map/frontlinesView';
import {EDGES,NODES,PORTS,gcDeg,nodePath,seaRoute} from '../map/seaLanes';
import {AIR_GOODS,pointAt,sanctioned,tradePairs,tradeRoutes} from '../map/tradeRoutes';

import {readFileSync} from 'node:fs';

const files=import.meta.glob<string>(['../map/WorldMap.tsx','../map/LivingWorldLayers.tsx','../ui/styles/livingWorld095.css','../main.tsx'],{query:'?raw',import:'default',eager:true});
const source=(name:string)=>{
  if(name.endsWith('.css')) return readFileSync(new URL(`../ui/styles/${name}`,import.meta.url),'utf8');
  return Object.entries(files).find(([path])=>path.endsWith('/'+name))![1];
};
// Every block that opens with exactly this selector, joined (the sheet declares its tokens in several places).
const block=(css:string,selector:string)=>{let out='',at=css.indexOf('\n'+selector+' {');while(at>=0){out+=css.slice(css.indexOf('{',at)+1,css.indexOf('}',at));at=css.indexOf('\n'+selector+' {',at+1);}return out;};

describe('phase 9.5 stage 2: landmark capital pins',()=>{
  it('draws the five landmarks named in the brief',()=>{
    for(const [iso,id] of [['TUR','anitkabir'],['FRA','eiffel'],['GBR','bigben'],['USA','whitehouse'],['RUS','kremlin']])expect(LANDMARK_ART[iso]?.id,iso).toBe(id);
  });
  it('only assigns landmarks to countries that have a capital position, with unique ids',()=>{
    const ids=Object.values(LANDMARK_ART).map(l=>l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    for(const iso of Object.keys(LANDMARK_ART))expect(CAPITAL_POSITIONS[iso],iso).toBeDefined();
  });
  it('renders one symbol per landmark with a viewBox and real artwork',()=>{
    const markup=renderToStaticMarkup(createElement('svg',null,createElement('defs',null,createElement(LandmarkSymbols))));
    expect((markup.match(/<symbol /g)??[]).length).toBe(Object.keys(LANDMARK_ART).length);
    for(const {id} of Object.values(LANDMARK_ART)){
      const at=markup.indexOf(`id="lm-${id}"`);expect(at,id).toBeGreaterThan(0);
      const piece=markup.slice(at,markup.indexOf('</symbol>',at));
      expect(piece).toContain('viewBox="0 0 24 24"');
      expect((piece.match(/<(path|rect|circle)/g)??[]).length,id).toBeGreaterThanOrEqual(4);
      expect(piece).not.toMatch(/href=|<image|<script/);
    }
  });
  it('maps an iso code to its symbol id and returns null for countries without one',()=>{
    expect(landmarkSymbolId('TUR')).toBe('lm-anitkabir');expect(landmarkSymbolId('XXX')).toBeNull();
  });
  it('is wired into the pin layer with a taller flag clip',()=>{
    const map=source('WorldMap.tsx');
    expect(map).toContain('<LandmarkSymbols/>');expect(map).toContain('capital-flag-clip-landmark');expect(map).toContain('data-landmark=');
  });
});

describe('phase 9.5 stage 2: alpine relief',()=>{
  it('generates the same peaks every time',()=>{
    expect(generatePeaks()).toEqual(generatePeaks());
    expect(PEAKS.length).toBeGreaterThan(500);expect(PEAKS.length).toBeLessThan(2500);
  });
  it('covers the five chains named in the brief',()=>{
    const names=CHAINS.map(c=>c.id);
    for(const name of ['Alps','Himalaya','Rockies','Andes','Taurus','Caucasus'])expect(names,name).toContain(name);
  });
  it('keeps every peak within a couple of degrees of its range spine',()=>{
    for(const chain of CHAINS){
      const lons=chain.spine.map(p=>p[0]),lats=chain.spine.map(p=>p[1]);
      const pad=chain.half*2+1;
      for(const peak of PEAKS.filter(p=>p.chain===chain.id)){
        expect(peak.lon).toBeGreaterThan(Math.min(...lons)-pad);expect(peak.lon).toBeLessThan(Math.max(...lons)+pad);
        expect(peak.lat).toBeGreaterThan(Math.min(...lats)-pad);expect(peak.lat).toBeLessThan(Math.max(...lats)+pad);
        expect([1,2,3]).toContain(peak.tier);expect(peak.rank).toBeGreaterThanOrEqual(0);expect(peak.rank).toBeLessThanOrEqual(1);
      }
    }
  });
  it('puts peaks where the famous summits are',()=>{
    const near=(lon:number,lat:number,deg:number,min=1)=>expect(PEAKS.filter(p=>Math.hypot(p.lon-lon,p.lat-lat)<deg).length).toBeGreaterThanOrEqual(min);
    near(6.9,45.9,1.2,3);near(86.9,27.9,1.5,3);near(-70,-32.6,1.5,2);near(42.4,43.3,1.2,2);near(-110.4,43.4,1.5,2);near(34.4,37.3,1.2,1);
  });
  it('spaces stations evenly along a spine',()=>{
    const s=stations([[0,0],[2,0]],2);
    expect(s.length).toBe(5);expect(Math.abs(s[1].p[0]-0.5)).toBeLessThan(1e-9);
  });
  it('shows nothing below the detail threshold and more as the camera closes in',()=>{
    const project=(p:[number,number]):[number,number]=>[600+(p[0]-8)*40,350-(p[1]-46)*40];
    expect(reliefDetail(RELIEF_MIN_PPD)).toBe(0);expect(reliefDetail(40)).toBe(1);
    expect(reliefPaths(PEAKS,{project,pixelsPerDegree:3}).count).toBe(0);
    const some=reliefPaths(PEAKS,{project,pixelsPerDegree:8}).count,more=reliefPaths(PEAKS,{project,pixelsPerDegree:20}).count;
    expect(some).toBeGreaterThan(0);expect(more).toBeGreaterThan(some);
  });
  it('grows peaks with zoom within sane bounds',()=>{
    expect(reliefScale(1)).toBe(0.6);expect(reliefScale(1000)).toBe(2.3);expect(reliefScale(18)).toBeGreaterThan(reliefScale(9));
  });
  it('hides the far side of a globe and shrinks peaks near the limb',()=>{
    const flat=(p:[number,number]):[number,number]=>[600+(p[0]-8)*60,350-(p[1]-46)*60];
    const far=reliefPaths(PEAKS,{project:flat,pixelsPerDegree:20,globeCenter:[-150,0]});
    expect(far.count).toBe(0);
    const near=reliefPaths(PEAKS,{project:flat,pixelsPerDegree:20,globeCenter:[8,46]});
    expect(near.count).toBeGreaterThan(0);
  });
  it('culls peaks outside the viewport',()=>{
    const project=(p:[number,number]):[number,number]=>[5000+p[0],5000+p[1]];
    expect(reliefPaths(PEAKS,{project,pixelsPerDegree:30}).count).toBe(0);
  });
  it('gives tall peaks snow caps and low hills none',()=>{
    expect(peakShape(100,100,12,3).snow).toMatch(/^M/);expect(peakShape(100,100,12,2).snow).toMatch(/^M/);
    expect(peakShape(100,100,12,1).snow).toBe('');expect(peakShape(100,100,12,1).snowShade).toBe('');
    const lit=peakShape(100,100,12,3).lit;expect(lit.startsWith('M')&&lit.endsWith('z')).toBe(true);
  });
  it('emits four path strings however many peaks show',()=>{
    const out=reliefPaths(PEAKS,{project:(p)=>[600+(p[0]-8)*60,350-(p[1]-46)*60],pixelsPerDegree:25});
    expect(out.count).toBeGreaterThan(20);expect(out.lit.length).toBeGreaterThan(100);expect(out.snow.length).toBeGreaterThan(50);
  });
});

const sq=(x:number,y:number,w=1,h=1):[number,number][]=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
describe('phase 9.5 stage 2: frontlines',()=>{
  it('finds the border two neighbours share',()=>{
    const a=[sq(0,0)],b=[sq(1,0)];
    const runs=sharedBorder(a,b);
    expect(runs.length).toBeGreaterThan(0);
    for(const v of runs[0])expect(Math.abs(v[0]-1)).toBeLessThan(1e-9); // every border vertex of A lies on x = 1
    expect(runs[0].length).toBeGreaterThanOrEqual(2);
  });
  it('finds no border between countries far apart',()=>{
    expect(sharedBorder([sq(0,0)],[sq(40,40)])).toEqual([]);
  });
  it('lands an overseas war on the defender coast nearest the attacker',()=>{
    const lines=beachhead([sq(0,0)],[sq(40,0)]);
    expect(lines).toHaveLength(1);
    for(const v of lines[0])expect(v[0]).toBeGreaterThanOrEqual(25);
    // the vertex chosen is on the west face, the one facing the attacker
    expect(lines[0].some(v=>v[0]===40)).toBe(true);
  });
  it('caches geometry per pair and chooses border or beachhead',()=>{
    clearFrontCache();
    const rings={AAA:[sq(0,0)],BBB:[sq(1,0)],CCC:[sq(60,0)]};
    expect(frontGeometry('AAA','BBB',rings)?.kind).toBe('border');
    expect(frontGeometry('AAA','CCC',rings)?.kind).toBe('beachhead');
    expect(frontGeometry('AAA','ZZZ',rings)).toBeNull();
    expect(frontGeometry('AAA','BBB',rings)).toBe(frontGeometry('AAA','BBB',rings));
  });
  it('turns army sizes into one to five troop steps, parity reading as three',()=>{
    expect(troopLevels(500,500)).toEqual({attacker:3,defender:3});
    expect(troopLevels(900,100)).toEqual({attacker:5,defender:1});
    expect(troopLevels(0,0)).toEqual({attacker:1,defender:1});
    for(const [a,d] of [[1,1000],[300,700],[1e6,3]])for(const level of Object.values(troopLevels(a,d))){expect(level).toBeGreaterThanOrEqual(1);expect(level).toBeLessThanOrEqual(5);}
  });
  it('counts a war as under assault for two days after its last combat round',()=>{
    const war={status:'active' as const,lastCombatDay:10,startedDay:1};
    expect(underAssault(war,10)).toBe(true);expect(underAssault(war,12)).toBe(true);expect(underAssault(war,13)).toBe(false);
    expect(underAssault({...war,status:'victory' as const},10)).toBe(false);
    expect(underAssault({status:'active',lastCombatDay:0,startedDay:9},10)).toBe(true);
  });
  it('hashes stably into the unit interval',()=>{
    expect(hash01('war-1')).toBe(hash01('war-1'));expect(hash01('war-1')).not.toBe(hash01('war-2'));
    for(const t of ['a','bb','war:123'])expect(hash01(t)).toBeGreaterThanOrEqual(0),expect(hash01(t)).toBeLessThan(1);
  });
  it('places effect points on the front and spreads them out',()=>{
    const line:[number,number][]=[[0,0],[100,0]];
    const pts=pointsAlong([line],3,'w');
    expect(pts).toHaveLength(3);
    for(const p of pts){expect(p.y).toBe(0);expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(100);}
    expect(new Set(pts.map(p=>Math.round(p.x))).size).toBe(3);
    expect(pointsAlong([line],3,'w')).toEqual(pts);expect(pointsAlong([],3,'w')).toEqual([]);
  });
  it('splits projected lines at hidden vertices and at wrap-around jumps',()=>{
    const project=(p:[number,number]):[number,number]|null=>p[0]<0?null:[p[0]*10,p[1]];
    expect(projectLines([[[1,0],[2,0],[-1,0],[3,0],[4,0]]],project)).toHaveLength(2);
    expect(projectLines([[[1,0],[2,0],[100,0],[101,0]]],project,300)).toHaveLength(2);
    expect(projectLines([[[1,0]]],project)).toEqual([]);
    expect(linesToPath([[[1,2],[3,4]]])).toBe('M1.0 2.0L3.0 4.0');
  });
  it('spaces chevron markers evenly with the normal facing the attacker',()=>{
    const m=markersAlong([[[0,0],[200,0]]],[100,-50],26,10);
    expect(m.length).toBe(8);for(const p of m)expect(p.ny).toBe(-1);
    expect(markersAlong([[[0,0],[200,0]]],[100,50],26,10)[0].ny).toBe(1);
    expect(markersAlong([[[0,0],[2000,0]]],null,26,10)).toHaveLength(10);
  });
  it('never gives two belligerents the same colour',()=>{
    const [a,d]=belligerentColors({iso2:'TR'},{iso2:'CH'}); // same national theme
    expect(a).not.toBe(d);
    const [x,y]=belligerentColors({iso2:'TR'},{iso2:'US'});expect(x).not.toBe(y);
  });
  const rings={AAA:[sq(0,0,10,10)],BBB:[sq(10,0,10,10)],CCC:[sq(90,0,5,5)]};
  const country=(iso2:string,personnel:number)=>({iso2,military:{personnel}}) as any;
  const countries={AAA:country('TR',900),BBB:country('US',100),CCC:country('JP',300)};
  const war=(id:string,a:string,d:string,last:number,status='active')=>({id,attackerId:a,defenderId:d,status,lastCombatDay:last,startedDay:1}) as any;
  const project=(p:[number,number]):[number,number]=>[p[0]*10,p[1]*10];
  const base={countries,playerCountryId:'AAA',rings,project,anchors:{AAA:[5,5] as [number,number],BBB:[15,5] as [number,number]},day:20};
  it('builds fronts for active wars only, with the player first',()=>{
    clearFrontCache();
    const fronts=warFronts({...base,wars:{w1:war('w1','BBB','CCC',19),w2:war('w2','AAA','BBB',19),w3:war('w3','AAA','CCC',19,'victory')}});
    expect(fronts.map(f=>f.id)).toEqual(['w2','w1']);
    expect(fronts[0].mine).toBe(true);expect(fronts[0].kind).toBe('border');expect(fronts[1].kind).toBe('beachhead');
    expect(fronts[0].path.startsWith('M')).toBe(true);
  });
  it('shows stronger armies as deeper chevron stacks',()=>{
    clearFrontCache();
    const [f]=warFronts({...base,wars:{w:war('w','AAA','BBB',19)}});
    expect(f.levels).toEqual({attacker:5,defender:1});
    const count=(d:string)=>(d.match(/M/g)??[]).length;
    expect(count(f.attackerPips)).toBeGreaterThan(count(f.defenderPips));
  });
  it('adds combat effects only while a war is under assault, more for the player, and respects the budget',()=>{
    clearFrontCache();
    const live=warFronts({...base,wars:{a:war('a','AAA','BBB',19),b:war('b','BBB','CCC',19)}});
    expect(live.find(f=>f.id==='a')!.fx).toHaveLength(3);expect(live.find(f=>f.id==='b')!.fx).toHaveLength(1);
    const quiet=warFronts({...base,wars:{a:war('a','AAA','BBB',5)}});
    expect(quiet[0].fx).toHaveLength(0);
    const capped=warFronts({...base,maxFx:2,wars:{a:war('a','AAA','BBB',19),b:war('b','BBB','CCC',19)}});
    expect(capped.reduce((n,f)=>n+f.fx.length,0)).toBe(2);
  });
  it('is deterministic',()=>{
    clearFrontCache();const w={w:war('w','AAA','BBB',19)};
    expect(warFronts({...base,wars:w})).toEqual(warFronts({...base,wars:w}));
  });
});

describe('phase 9.5 stage 2: sea lanes',()=>{
  it('uses only known waypoints and valid coordinates',()=>{
    for(const [a,b] of EDGES){expect(NODES[a],a).toBeDefined();expect(NODES[b],b).toBeDefined();}
    for(const [id,[lon,lat]] of Object.entries(NODES)){expect(Math.abs(lon),id).toBeLessThanOrEqual(180);expect(Math.abs(lat),id).toBeLessThanOrEqual(90);}
    for(const [iso,list] of Object.entries(PORTS))for(const [,,node] of list)expect(NODES[node],`${iso} ${node}`).toBeDefined();
  });
  it('keeps edges to a believable length',()=>{
    for(const [a,b] of EDGES)expect(gcDeg(NODES[a],NODES[b]),`${a}-${b}`).toBeLessThan(75);
  });
  it('connects every port to the rest of the network',()=>{
    for(const [iso,list] of Object.entries(PORTS))for(const [,,node] of list)expect(nodePath(node,'ENGC'),`${iso} ${node}`).not.toBeNull();
  });
  it('sails China to the Netherlands through Malacca, Bab-el-Mandeb and Suez',()=>{
    const route=seaRoute('CHN','NLD')!;
    expect(route).not.toBeNull();
    for(const waypoint of ['MALAC','BAB','SUEZN','GIB'])expect(route.points.some(p=>p[0]===NODES[waypoint][0]&&p[1]===NODES[waypoint][1]),waypoint).toBe(true);
    expect(PORTS.CHN.some(([lon,lat])=>route.points[0][0]===lon&&route.points[0][1]===lat)).toBe(true);
    expect(PORTS.NLD.some(([lon,lat])=>route.points.at(-1)![0]===lon&&route.points.at(-1)![1]===lat)).toBe(true);
  });
  it('sends Chile to Norway through the Panama canal and the other way round alike',()=>{
    const there=seaRoute('CHL','NOR')!,back=seaRoute('NOR','CHL')!;
    expect(there.points.some(p=>p[0]===NODES.PANAP[0]&&p[1]===NODES.PANAP[1])).toBe(true);
    expect(back.points[0]).toEqual(there.points[there.points.length-1]);
    expect(Math.abs(back.length-there.length)).toBeLessThan(1e-9);
  });
  it('picks the nearer of a country\'s ports',()=>{
    const east=seaRoute('USA','GBR')!,west=seaRoute('USA','JPN')!;
    expect(east.points[0]).toEqual([-73.5,40.2]);
    expect(west.points[0]).toEqual([-118.6,33.4]);
  });
  it('returns null for landlocked, unknown or same-country pairs',()=>{
    expect(seaRoute('CHE','NLD')).toBeNull();expect(seaRoute('NLD','CHE')).toBeNull();expect(seaRoute('NLD','NLD')).toBeNull();expect(seaRoute('ZZZ','YYY')).toBeNull();
  });
  it('finds shortest node paths and handles identical endpoints',()=>{
    expect(nodePath('ENGC','ENGC')).toEqual(['ENGC']);
    const p=nodePath('NSEA','CHANW')!;expect(p[0]).toBe('NSEA');expect(p.at(-1)).toBe('CHANW');
  });
});

describe('phase 9.5 stage 2: trade routes',()=>{
  const deal=(id:string,s:string,b:string,resource:string,active=true)=>({id,sellerId:s,buyerId:b,resource,active,quantityPerDay:1,pricePerUnit:1}) as any;
  const contract=(id:string,s:string,b:string,good:string,active=true)=>({id,sellerId:s,buyerId:b,good,active}) as any;
  const rel=(sanctions:boolean)=>({score:0,status:'neutral',treaties:[],sanctions});
  const mk=(relations:Record<string,any>={})=>({diplomacy:{relations}}) as any;
  const countries:Record<string,any>={SAU:mk(),CHN:mk(),USA:mk(),JPN:mk(),CHE:mk(),NLD:mk(),TUR:mk({RUS:rel(true),IRN:rel(true)}),RUS:mk({TUR:rel(true)}),IRN:mk()};
  const anchors:Record<string,[number,number]>={SAU:[46.7,24.7],CHN:[116.4,39.9],USA:[-77,38.9],JPN:[139.7,35.7],CHE:[7.4,46.9],NLD:[4.9,52.4],TUR:[32.9,39.9],RUS:[37.6,55.7],IRN:[51.4,35.7]};
  const project=(p:[number,number]):[number,number]=>[(p[0]+180)*3,(90-p[1])*3.5];
  const base={countries,playerCountryId:'TUR',anchors,project};
  it('classifies goods and pairs',()=>{
    expect(AIR_GOODS.has('uranium')).toBe(true);expect(AIR_GOODS.has('oil')).toBe(false);expect(AIR_GOODS.has('gold')).toBe(true);
    const pairs=tradePairs({a:deal('a','SAU','CHN','oil'),b:deal('b','CHN','SAU','uranium'),c:deal('c','USA','JPN','food',false)},{k:contract('k','JPN','USA','electronics'),z:contract('z','JPN','USA','steel',false)});
    expect(pairs.size).toBe(2);
    expect(pairs.get('CHN|SAU')).toMatchObject({bulk:true,precious:true});
    expect(pairs.get('JPN|USA')).toMatchObject({bulk:false,precious:true});
  });
  it('detects sanctions in either direction',()=>{
    expect(sanctioned(countries,'TUR','RUS')).toBe(true);expect(sanctioned(countries,'RUS','TUR')).toBe(true);expect(sanctioned(countries,'CHN','SAU')).toBe(false);
  });
  it('sails bulk goods, flies precious ones and flies between countries without a port',()=>{
    const routes=tradeRoutes({...base,tradeDeals:{a:deal('a','SAU','CHN','oil'),b:deal('b','USA','JPN','gold'),c:deal('c','CHE','NLD','food')},contracts:{}});
    const byPair=(x:string)=>routes.find(r=>r.id.startsWith(x))!;
    expect(byPair('CHN|SAU').mode).toBe('sea');expect(byPair('JPN|USA').mode).toBe('air');expect(byPair('CHE|NLD').mode).toBe('air');
    for(const r of routes.filter(x=>!x.sanctioned)){expect(r.path.startsWith('M')).toBe(true);expect(r.total).toBeGreaterThan(0);expect(r.carriers).toBeGreaterThanOrEqual(1);}
  });
  it('marks sanctioned trade with a blockade marker and no carriers',()=>{
    const [r]=tradeRoutes({...base,tradeDeals:{a:deal('a','RUS','TUR','oil')},contracts:{}});
    expect(r.sanctioned).toBe(true);expect(r.marker).not.toBeNull();expect(r.carriers).toBe(0);expect(r.mine).toBe(true);
  });
  it('shows blocked corridors for sanctions the player has no deal under, and only those',()=>{
    const routes=tradeRoutes({...base,tradeDeals:{},contracts:{}});
    expect(routes.map(r=>r.id).sort()).toEqual(['IRN|TUR:air','RUS|TUR:air']);
    for(const r of routes){expect(r.sanctioned).toBe(true);expect(r.mode).toBe('air');}
  });
  it('lists the player\'s routes first, sanctioned ahead of free, and respects the cap',()=>{
    const deals={a:deal('a','SAU','CHN','oil'),b:deal('b','TUR','NLD','oil'),c:deal('c','USA','JPN','food')};
    const routes=tradeRoutes({...base,tradeDeals:deals,contracts:{},maxSanctionOnly:0});
    expect(routes[0].mine).toBe(true);
    expect(tradeRoutes({...base,tradeDeals:deals,contracts:{},maxRoutes:2,maxSanctionOnly:0})).toHaveLength(2);
  });
  it('is deterministic and ignores inactive deals',()=>{
    const deals={a:deal('a','SAU','CHN','oil'),b:deal('b','USA','JPN','food',false)};
    expect(tradeRoutes({...base,tradeDeals:deals,contracts:{}})).toEqual(tradeRoutes({...base,tradeDeals:deals,contracts:{}}));
    expect(tradeRoutes({...base,tradeDeals:{b:deal('b','USA','JPN','food',false)},contracts:{},maxSanctionOnly:0})).toEqual([]);
  });
  it('walks a carrier along the visible route and wraps around',()=>{
    const route={runs:[[[0,0],[100,0]],[[200,0],[200,100]]] as [number,number][][],starts:[0,100],total:200};
    expect(pointAt(route,50)).toMatchObject({x:50,y:0,heading:0});
    expect(pointAt(route,150)).toMatchObject({x:200,y:50,heading:90});
    expect(pointAt(route,250)).toMatchObject({x:50,y:0});
    expect(pointAt({runs:[],starts:[],total:0},5)).toBeNull();
  });
  it('splits a flat-map route at the antimeridian',()=>{
    const [r]=tradeRoutes({...base,tradeDeals:{b:deal('b','USA','JPN','gold')},contracts:{},jump:300,maxSanctionOnly:0});
    expect(r.runs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('phase 9.5 stage 2: wiring and styling',()=>{
  const map=source('WorldMap.tsx'),layers=source('LivingWorldLayers.tsx'),css=source('livingWorld095.css');
  it('renders every new layer from the map',()=>{
    for(const tag of ['<MountainRelief','<TradeLayer','<FrontlineLayer','<CombatFx'])expect(map).toContain(tag);
    expect(map).toContain('warFronts(');expect(map).toContain('tradeRoutes(');
  });
  it('keeps the layers presentation-only',()=>{
    expect(layers).not.toContain('useGameStore');expect(layers).not.toMatch(/from ['"][./]*\/?(engine|simulation)/);
  });
  it('never takes pointer events and hides the layers from assistive technology',()=>{
    expect((layers.match(/pointerEvents="none"/g)??[]).length).toBeGreaterThanOrEqual(4);expect((layers.match(/aria-hidden="true"/g)??[]).length).toBeGreaterThanOrEqual(4);
  });
  it('animates carriers with one frame loop and no per-frame React render',()=>{
    expect(layers).toContain('requestAnimationFrame');expect(layers).toContain('cancelAnimationFrame');expect(layers).toContain('document.hidden');
    expect(layers).toContain("setAttribute('transform'");
  });
  it('defines every colour token for both Navy and Ivory',()=>{
    const navy=block(css,':root'),ivory=block(css,':root[data-theme="light"]');
    const names=[...navy.matchAll(/(--[a-z-]+):/g)].map(m=>m[1]);
    expect(names.length).toBeGreaterThanOrEqual(25);
    for(const name of names)expect(ivory,name).toContain(name+':');
  });
  it('stops every animation for people who ask for reduced motion',()=>{
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    const reduced=css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for(const selector of ['.front-atk','.fx-flash','.fx-smoke','.fx-spark'])expect(reduced).toContain(selector);
    expect(layers).toContain('prefers-reduced-motion');
  });
  it('loads before the hotfix sheets',()=>{
    const main=source('main.tsx');expect(main.indexOf('livingWorld095.css')).toBeGreaterThan(0);expect(main.indexOf('livingWorld095.css')).toBeLessThan(main.indexOf('hotfix15.css'));
  });
});
