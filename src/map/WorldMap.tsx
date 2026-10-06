import { useEffect, useMemo, useRef, useState } from 'react';
import { geoCentroid, geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath } from 'd3-geo';
import { findCountryAtGeoPoint } from './mapSelection';
import { useGameStore } from '../store/gameStore';
import { calculateMilitaryPower } from '../store/selectors';
import { MICROSTATE_POINTS } from '../data/microstates';
import { terrainForCountry } from '../engine/systems/warfare';
import { tr } from '../i18n/gameI18n';

const W = 1200;
const H = 700;

type ProjectionMode = 'globe' | 'flat';
type Feature = { type: 'Feature'; geometry: any; properties: { iso_a3?: string; name?: string } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };
type DragState = { x: number; y: number; rotation: [number, number, number]; pan: { x: number; y: number }; moved: boolean };

const politicalPalette = ['#355f72','#466c63','#6d5f4d','#5d5575','#7b5660','#4d6675','#4e7361','#7a653f','#4f6072','#65704a','#70554f','#467077'];
const WATER_LABELS:Array<{name:string;position:[number,number];major?:boolean;minZoom?:number}> = [
  {name:'NORTH ATLANTIC OCEAN',position:[-36,34],major:true},
  {name:'SOUTH ATLANTIC OCEAN',position:[-18,-27],major:true},
  {name:'INDIAN OCEAN',position:[76,-23],major:true},
  {name:'PACIFIC OCEAN',position:[-150,8],major:true},
  {name:'ARCTIC OCEAN',position:[8,76],major:true},
  {name:'MEDITERRANEAN SEA',position:[17.5,35.4],minZoom:1.15},
  {name:'BLACK SEA',position:[34.5,43.3],minZoom:1.25},
  {name:'AEGEAN SEA',position:[25.1,38.4],minZoom:1.8},
  {name:'RED SEA',position:[38.2,20.2],minZoom:1.25},
  {name:'ARABIAN SEA',position:[65,16],minZoom:1.15},
  {name:'BALTIC SEA',position:[19.5,57.4],minZoom:1.55},
  {name:'CARIBBEAN SEA',position:[-75,15],minZoom:1.3},
  {name:'CASPIAN SEA',position:[51,41.3],minZoom:1.4},
];
const religionColors: Record<string,string> = {
  christianity:'#416985', catholic_christianity:'#4965a0', orthodox_christianity:'#66558d', protestant_christianity:'#397e8c',
  islam:'#3f7557', hinduism:'#9e7038', buddhism:'#a48538', judaism:'#4b72a6', unaffiliated:'#606b76', folk_or_mixed:'#79576a',
};
const ideologyColors: Record<string,string> = { pluralist:'#3c739b', state_centric:'#844c52', state_socialist:'#923d3d', royalist:'#745e8e', religious_state:'#56764a' };

function stablePoliticalColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return politicalPalette[hash % politicalPalette.length];
}

export function WorldMap() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('globe');
  const [rotation, setRotation] = useState<[number, number, number]>([-26,-24,0]);
  const [globeZoom, setGlobeZoom] = useState(1);
  const [flatZoom, setFlatZoom] = useState(1);
  const [flatPan, setFlatPan] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [mapMenuOpen,setMapMenuOpen]=useState(false);
  const dragRef = useRef<DragState | null>(null);
  const justDraggedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ dx: number; dy: number } | null>(null);

  const countries = useGameStore((s) => s.countries);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const mapMode = useGameStore((s) => s.mapMode);
  const mapPresentation = useGameStore((s) => s.mapPresentation);
  const setMapPresentation = useGameStore((s) => s.setMapPresentation);
  const language = useGameStore((s) => s.playerProfile.language);
  const playerCountryId = useGameStore((s) => s.playerCountryId);
  const selectCountry = useGameStore((s) => s.selectCountry);
  const setMapNotice = useGameStore((s) => s.setMapNotice);

  useEffect(() => {
    let alive = true;
    fetch('/data/countries.geojson').then((r) => r.json()).then((data) => { if (alive) setGeojson(data); });
    return () => { alive = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const projection = useMemo(() => {
    if (!geojson) return null;
    if (projectionMode === 'flat') return geoNaturalEarth1().fitExtent([[34,34],[W-34,H-34]], geojson as any).precision(0.25);
    return geoOrthographic().translate([W/2,H/2+8]).scale(286 * globeZoom).rotate(rotation).clipAngle(89.999).precision(0.25);
  }, [geojson, projectionMode, rotation, globeZoom]);

  const path = useMemo(() => projection ? geoPath(projection) : null, [projection]);
  const graticule = useMemo(() => geoGraticule10(), []);
  const player = countries[playerCountryId];

  const colorFor = (id: string) => {
    const country = countries[id];
    if (!country) return '#1d3240';
    const relation = player?.diplomacy.relations[country.id];
    const controlled = country.controllerCountryId === player?.id;
    if (mapMode === 'political') return country.id === player?.id || controlled ? '#d9ad48' : stablePoliticalColor(country.id);
    if (mapMode === 'diplomacy') return country.id === player?.id ? '#d9ad48' : relation?.status === 'ally' ? '#3aa9ba' : relation?.status === 'friendly' ? '#4c936c' : relation?.status === 'hostile' || relation?.status === 'war' ? '#ad4952' : '#50616f';
    if (mapMode === 'resources') {
      const stock = country.resources.food + country.resources.oil * 1.7 + country.resources.iron + country.resources.uranium * 12;
      return stock > 1500 ? '#2c8057' : stock > 800 ? '#687f4c' : stock > 350 ? '#927543' : '#69494a';
    }
    if (mapMode === 'military') {
      const score = country.military.assessment.capability || Math.min(100, calculateMilitaryPower(country) / 120);
      return score > 80 ? '#a7303d' : score > 60 ? '#a95244' : score > 40 ? '#866746' : score > 20 ? '#615c70' : '#3d5364';
    }
    if (mapMode === 'religion') return religionColors[country.society.dominantReligion] ?? '#56636e';
    if (mapMode === 'ideology') return ideologyColors[country.society.ideology] ?? '#56636e';
    return '#355266';
  };

  const hoveredCountry = hovered ? countries[hovered] : null;
  const selectedCountry = selectedCountryId ? countries[selectedCountryId] : null;
  const flatTransform = `translate(${flatPan.x} ${flatPan.y}) translate(${W/2} ${H/2}) scale(${flatZoom}) translate(${-W/2} ${-H/2})`;
  const viewportKey = projectionMode === 'globe' ? `g-${rotation[0].toFixed(1)}-${rotation[1].toFixed(1)}-${globeZoom.toFixed(2)}` : 'flat-static-geometry';

  const resetView = () => {
    setRotation([-26,-24,0]);
    setGlobeZoom(1);
    setFlatZoom(1);
    setFlatPan({ x: 0, y: 0 });
  };

  const pointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, rotation: [...rotation], pan: { ...flatPan }, moved: false };
  };

  const pointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { d.moved = true; justDraggedRef.current = true; }
    pendingMoveRef.current = { dx, dy };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      const pending = pendingMoveRef.current;
      const drag = dragRef.current;
      rafRef.current = null;
      if (!pending || !drag) return;
      if (projectionMode === 'globe') {
        setRotation([drag.rotation[0] + pending.dx * 0.20, Math.max(-75, Math.min(75, drag.rotation[1] - pending.dy * 0.17)), 0]);
      } else {
        setFlatPan({ x: drag.pan.x + pending.dx / Math.max(1, flatZoom), y: drag.pan.y + pending.dy / Math.max(1, flatZoom) });
      }
    });
  };

  const pointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    window.setTimeout(() => { justDraggedRef.current = false; }, 100);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const wheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (projectionMode === 'globe') setGlobeZoom((z) => Math.max(.68, Math.min(3.2, z + (e.deltaY < 0 ? .11 : -.11))));
    else setFlatZoom((z) => Math.max(1, Math.min(8, Number((z * (e.deltaY < 0 ? 1.15 : .87)).toFixed(3)))));
  };

  const screenPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect=e.currentTarget.getBoundingClientRect();
    return [(e.clientX-rect.left)*W/rect.width,(e.clientY-rect.top)*H/rect.height] as [number,number];
  };

  const selectFromSurface = (e: React.MouseEvent<SVGSVGElement>) => {
    const currentProjection=projection;
    const currentGeojson=geojson;
    if (justDraggedRef.current || !currentProjection || !currentGeojson || !currentProjection.invert) return;
    let [x,y]=screenPoint(e);
    if (projectionMode==='flat') {
      x=W/2+(x-flatPan.x-W/2)/flatZoom;
      y=H/2+(y-flatPan.y-H/2)/flatZoom;
    }
    const geo=currentProjection.invert([x,y]);
    if (!geo) return;
    const selectable=new Set(Object.keys(countries));
    const polygonId=findCountryAtGeoPoint(currentGeojson.features as any,selectable,geo as [number,number]);
    if (polygonId) {
      const country=countries[polygonId];
      selectCountry(polygonId);
      setMapNotice(`${country.name} selected — sovereign territory acquired.`);
      return;
    }
    const micro=Object.entries(MICROSTATE_POINTS)
      .map(([id,pos])=>({id,distance:geoDistance(pos as [number,number],geo as [number,number])}))
      .filter((item)=>countries[item.id])
      .sort((a,b)=>a.distance-b.distance)[0];
    const hitRadius=(projectionMode==='flat'?1.2/Math.max(1,flatZoom):1.0/Math.max(.8,globeZoom))*Math.PI/180;
    if (micro && micro.distance<=hitRadius) {
      selectCountry(micro.id);
      setMapNotice(`${countries[micro.id].name} selected — microstate command profile loaded.`);
      return;
    }
    selectCountry(null);
    setHovered(null);
    setMapNotice('Open waters — no sovereign state selected.');
  };

  const zoomBy=(factor:number)=>{
    if(projectionMode==='globe')setGlobeZoom(z=>Math.max(.68,Math.min(3.2,Number((z*factor).toFixed(2)))));
    else setFlatZoom(z=>Math.max(1,Math.min(8,Number((z*factor).toFixed(2)))));
  };

  const focusSelected=()=>{
    if(!selectedCountry||!geojson)return;
    const feature=geojson.features.find(f=>String(f.properties?.iso_a3??'')===selectedCountry.id);
    if(!feature)return;
    const [lon,lat]=geoCentroid(feature as any);
    if(projectionMode==='globe'){setRotation([-lon,-lat,0]);setGlobeZoom(z=>Math.max(1.55,z));}
    else{
      const base=geoNaturalEarth1().fitExtent([[34,34],[W-34,H-34]],geojson as any).precision(.25);
      const p=base([lon,lat]); if(!p)return;
      const z=Math.max(2.4,flatZoom); setFlatZoom(z); setFlatPan({x:-z*(p[0]-W/2),y:-z*(p[1]-H/2)});
    }
  };

  if (!geojson || !projection || !path) return <div className="world-map political-map"><div className="map-loading">INITIALIZING WORLD GEOMETRY…</div></div>;

  const shapeLayer = geojson.features.map((feature) => {
    const id = String(feature.properties?.iso_a3 ?? '');
    const country = countries[id];
    const d = path(feature as any) ?? '';
    if (!d) return null;
    const isSelected = id === selectedCountryId;
    const isHovered = id === hovered;
    const terrain=country?terrainForCountry(country):'plains';
    const fill=mapPresentation==='geographic'&&mapMode==='political'?`url(#terrain-${terrain})`:colorFor(id);
    return <path key={id || feature.properties?.name} d={d} className={`country-shape ${mapPresentation==='geographic'?'geographic':''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`} fill={fill} onPointerEnter={() => country && setHovered(id)} onPointerLeave={() => setHovered((v) => v === id ? null : v)}><title>{country?.name ?? feature.properties?.name}</title></path>;
  });


  const mapZoom=projectionMode==='globe'?globeZoom:flatZoom;
  const countryLabels=geojson.features.map((feature)=>{
    const id=String(feature.properties?.iso_a3??'');
    const country=countries[id];
    if(!country||id===selectedCountryId||MICROSTATE_POINTS[id as keyof typeof MICROSTATE_POINTS])return null;
    const d=path(feature as any); if(!d)return null;
    const centroid=geoCentroid(feature as any);
    if(projectionMode==='globe'){
      const center:[number,number]=[-rotation[0],-rotation[1]];
      if(geoDistance(centroid,center)>Math.PI/2)return null;
    }
    const p=projection(centroid); if(!p)return null;
    const bounds=path.bounds(feature as any);
    const projectedArea=Math.abs((bounds[1][0]-bounds[0][0])*(bounds[1][1]-bounds[0][1]))*(projectionMode==='flat'?flatZoom*flatZoom:1);
    const threshold=mapZoom>=4.2?55:mapZoom>=3?135:mapZoom>=2?240:mapZoom>=1.4?600:1250;
    if(projectedArea<threshold)return null;
    const labelSize=mapZoom>=4?14:mapZoom>=2.8?13:mapZoom>=2?12:11;
    return <text key={`country-label-${id}`} x={p[0]} y={p[1]} className="country-map-label" style={{fontSize:labelSize}}>{country.name.toUpperCase()}</text>;
  });

  return <div className="world-map political-map">
    <div className={`map-dock ${mapMenuOpen?'open':''}`}>
      {mapMenuOpen&&<section className="map-dock-popover" aria-label="Map settings">
        <header><span><small>WORLD VIEW</small><strong>MAP SETTINGS</strong></span><button onClick={()=>setMapMenuOpen(false)} aria-label="Close map settings">×</button></header>
        <div className="map-setting-group"><small>BASE MAP</small><div><button className={mapPresentation==='political'?'active':''} onClick={()=>setMapPresentation('political')}>{tr(language,'political')}</button><button className={mapPresentation==='geographic'?'active':''} onClick={()=>setMapPresentation('geographic')}>{tr(language,'geographic')}</button></div></div>
        <div className="map-setting-group"><small>PROJECTION</small><div><button className={projectionMode==='globe'?'active':''} onClick={()=>setProjectionMode('globe')}>GLOBE</button><button className={projectionMode==='flat'?'active':''} onClick={()=>setProjectionMode('flat')}>FLAT</button></div></div>
        <div className="map-setting-group"><small>CAMERA</small><div className="map-camera-grid"><button onClick={()=>zoomBy(.8)}>− ZOOM</button><button onClick={()=>zoomBy(1.25)}>+ ZOOM</button><button disabled={!selectedCountry} onClick={focusSelected}>FOCUS</button><button onClick={resetView}>RESET</button></div></div>
        <footer>{projectionMode==='flat'?flatZoom.toFixed(1):globeZoom.toFixed(1)}× · {mapPresentation.toUpperCase()} · {projectionMode.toUpperCase()}</footer>
      </section>}
      <button className="map-dock-trigger" onClick={()=>setMapMenuOpen(v=>!v)}><span>⌖</span><strong>MAP</strong><small>{projectionMode==='globe'?'GLOBE':'FLAT'} · {mapPresentation==='political'?'POL':'GEO'}</small></button>
    </div>
    <div className="map-hover-readout">
      <strong>{hoveredCountry?.name ?? selectedCountry?.name ?? 'WORLD COMMAND'}</strong>
      <span>{hoveredCountry ? `${hoveredCountry.region || 'Global'} · ${hoveredCountry.military.assessment.capability.toFixed(0)} MIL` : projectionMode === 'globe' ? 'drag globe · wheel zoom · click sovereign territory' : 'drag to pan · wheel zoom · click sovereign territory'}</span>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} className={projectionMode === 'globe' ? 'strategy-svg globe-svg' : 'strategy-svg flat-svg'} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} onClick={selectFromSurface} shapeRendering="geometricPrecision">
      <defs>
        <pattern id="terrain-plains" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#6d8061"/><path d="M0 14C5 11 10 16 18 12" fill="none" stroke="#9aab83" strokeOpacity=".22" strokeWidth="1"/></pattern>
        <pattern id="terrain-forest" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#3f6b52"/><circle cx="3" cy="4" r="1.5" fill="#234936" fillOpacity=".65"/><circle cx="10" cy="9" r="1.7" fill="#2a513c" fillOpacity=".7"/></pattern>
        <pattern id="terrain-desert" width="20" height="16" patternUnits="userSpaceOnUse"><rect width="20" height="16" fill="#a88a5a"/><path d="M0 10Q5 6 10 10t10 0" fill="none" stroke="#d5bb7d" strokeOpacity=".35"/></pattern>
        <pattern id="terrain-mountain" width="22" height="20" patternUnits="userSpaceOnUse"><rect width="22" height="20" fill="#657065"/><path d="M1 17 7 6l4 7 4-9 6 13" fill="none" stroke="#aab0a4" strokeOpacity=".42" strokeWidth="1.1"/></pattern>
        <pattern id="terrain-urban" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#687077"/><path d="M0 8h16M8 0v16" stroke="#9da3a8" strokeOpacity=".18"/></pattern>
        <pattern id="terrain-coastal" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#53796c"/><path d="M0 5c5 3 9-3 18 0M0 12c6 3 11-2 18 0" fill="none" stroke="#8fb6a8" strokeOpacity=".26"/></pattern>
      </defs>
      {projectionMode === 'flat' && <rect x="0" y="0" width={W} height={H} className="flat-ocean"/>}
      {projectionMode === 'globe' && <>
        <path d={path({ type: 'Sphere' } as any) ?? ''} className="ocean-sphere"/>
        <path d={path(graticule as any) ?? ''} className="globe-graticule"/>
      </>}
      <g key={viewportKey} className="map-viewport" transform={projectionMode === 'flat' ? flatTransform : undefined}>
        <g className="country-layer">{shapeLayer}</g>
        <g className="country-label-layer">{countryLabels}</g>
        <g className="water-label-layer">{WATER_LABELS.map((label)=>{
          const zoom=projectionMode==='globe'?globeZoom:flatZoom;
          if(label.minZoom&&zoom<label.minZoom)return null;
          if(projectionMode==='globe'){
            const center:[number,number]=[-rotation[0],-rotation[1]];
            if(geoDistance(label.position,center)>Math.PI/2)return null;
          }
          const p=projection(label.position); if(!p)return null;
          return <text key={label.name} x={p[0]} y={p[1]} className={label.major?'water-label major':'water-label'}>{label.name}</text>;
        })}</g>
        {Object.entries(MICROSTATE_POINTS).map(([id,pos]) => {
          const c=countries[id]; if(!c) return null;
          if (projectionMode==='globe') { const center:[number,number]=[-rotation[0],-rotation[1]]; if(geoDistance(pos as [number,number],center)>Math.PI/2) return null; }
          const p=projection(pos as [number,number]); if(!p) return null;
          const reveal=id===selectedCountryId||id===hovered||(projectionMode==='flat'?flatZoom>=2.2:globeZoom>=1.45);
          return <g key={id} className={`microstate-point ${reveal?'revealed':''} ${id===selectedCountryId?'selected':''}`} transform={`translate(${p[0]},${p[1]})`} onPointerEnter={()=>setHovered(id)} onPointerLeave={()=>setHovered((v)=>v===id?null:v)}><circle r={id===selectedCountryId?5:3.2}/>{(id===selectedCountryId||id===hovered)&&<text y="-10">{c.name}</text>}</g>;
        })}
        {selectedCountry && geojson.features.map((f) => String(f.properties?.iso_a3 ?? '') === selectedCountry.id ? f : null).filter(Boolean).map((f: any) => {
          const centroid = geoCentroid(f); const p = projection(centroid); if (!p) return null;
          if (projectionMode === 'globe') {
            const center: [number,number] = [-rotation[0],-rotation[1]];
            if (geoDistance(centroid, center) > Math.PI/2) return null;
          }
          const selectedSize=mapZoom>=2.8?16:14;
          return <g key="selected-label" transform={`translate(${p[0]},${p[1]})`} className="selected-map-label"><circle r="4.5"/><text y="-12" style={{fontSize:selectedSize}}>{selectedCountry.name.toUpperCase()}</text></g>;
        })}
      </g>
    </svg>
  </div>;
}
