import {boundPan,clampZoom,wheelZoomFactor,zoomAtPoint} from './cameraControls';
import {GeographicSurface} from './GeographicSurface';
import { useEffect, useMemo, useRef, useState } from 'react';
import { geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath } from 'd3-geo';
import { countryMapAnchor, microstateVisible, nearestMapMarker, type MapPoint } from './mapCoordinates';
import { findCountryAtGeoPoint } from './mapSelection';
import { labelFontSize, labelRevealThreshold, layoutScreenLabels, maxCountryLabels, type ScreenLabelCandidate } from './labelLayout';
import { useGameStore } from '../store/gameStore';
import { calculateMilitaryPower } from '../store/selectors';
import { MICROSTATE_POINTS } from '../data/microstates';
import { terrainForCountry } from '../engine/systems/warfare';

const W = 1200;
const H = 700;

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
  const [rotation, setRotation] = useState<[number, number, number]>([-26,-24,0]);
  const [globeZoom, setGlobeZoom] = useState(1);
  const [flatZoom, setFlatZoom] = useState(1);
  const [flatPan, setFlatPan] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef=useRef<SVGSVGElement>(null);
  const wheelFrame=useRef<number|null>(null);
  const pendingWheel=useRef({factor:1,point:[600,350] as [number,number]});
  const camera=useRef({globeZoom,flatZoom,flatPan});
  camera.current={globeZoom,flatZoom,flatPan};
  const dragRef = useRef<DragState | null>(null);
  const justDraggedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ dx: number; dy: number } | null>(null);

  const countries = useGameStore((s) => s.countries);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const zoomSensitivity=useGameStore(s=>s.mapZoomSensitivity);
  const labelScale = useGameStore((s) => s.mapLabelScale);
  const [surfaceReady,setSurfaceReady]=useState(false);
  const mapMode = useGameStore((s) => s.mapMode);
  const mapPresentation = useGameStore((s) => s.mapPresentation);
  const projectionMode = useGameStore((s) => s.mapProjection);
  const mapControlCommand = useGameStore((s)=>s.mapControlCommand);
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
  const featureMetrics = useMemo(() => geojson && path ? geojson.features.map(feature => ({
    feature,
    id: String(feature.properties?.iso_a3 ?? ''),
    anchor: countryMapAnchor(String(feature.properties?.iso_a3 ?? ''), feature),
    area: path.area(feature as any),
    d: path(feature as any) ?? '',
  })) : [], [geojson, path]);
  const countryLabelMetrics = useMemo(() => {
    const largest = new Map<string, typeof featureMetrics[number]>();
    for (const metric of featureMetrics) {
      if (!largest.has(metric.id) || metric.area > largest.get(metric.id)!.area) largest.set(metric.id, metric);
    }
    return [...largest.values()];
  }, [featureMetrics]);
  const graticule = useMemo(() => geoGraticule10(), []);
  const player = countries[playerCountryId];

  const colorFor = (id: string) => {
    const country = countries[id];
    if (!country) return '#1d3240';
    const relation = player?.diplomacy.relations[country.id];
    const controlled = country.controllerCountryId === player?.id;
    if (mapMode === 'political') return country.id === player?.id || controlled ? '#d9ad48' : stablePoliticalColor(country.id);
    if (mapMode === 'relations') {if(country.id===player?.id)return '#edc570';const score=relation?.score??0;const t=Math.min(1,Math.abs(score)/100),neutral=[115,133,144],end=score>=0?[57,177,115]:[204,86,98];return `rgb(${neutral.map((v,i)=>Math.round(v+(end[i]-v)*t)).join(',')})`;}
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

  const photographic=mapPresentation==='geographic'&&mapMode==='political';
  const hoveredCountry = hovered ? countries[hovered] : null;
  const selectedCountry = selectedCountryId ? countries[selectedCountryId] : null;
  const flatTransform = `translate(${flatPan.x} ${flatPan.y}) translate(${W/2} ${H/2}) scale(${flatZoom}) translate(${-W/2} ${-H/2})`;
  const projectToScreen=(position:[number,number])=>{
    const p=projection?.(position);
    if(!p)return null;
    if(projectionMode==='flat')return [flatPan.x+W/2+flatZoom*(p[0]-W/2),flatPan.y+H/2+flatZoom*(p[1]-H/2)] as [number,number];
    return p as [number,number];
  };
  const mapZoom=projectionMode==='globe'?globeZoom:flatZoom;
  const globeCenter:MapPoint=[-rotation[0],-rotation[1]];
  const visibleMarkers=Object.entries(MICROSTATE_POINTS).flatMap(([id,position])=>{
    if(!countries[id]||!microstateVisible(mapZoom,projectionMode==='flat',id===selectedCountryId,id===hovered,id===playerCountryId))return [];
    if(projectionMode==='globe'&&geoDistance(position,globeCenter)>Math.PI/2)return [];
    const point=projectToScreen(position);
    if(!point||point[0]<0||point[0]>W||point[1]<0||point[1]>H)return [];
    return [{id,point}];
  });
  const viewportKey = projectionMode === 'globe' ? `g-${rotation[0].toFixed(1)}-${rotation[1].toFixed(1)}-${globeZoom.toFixed(2)}` : 'flat-static-geometry';

  const resetView = () => {
    setRotation([-26,-24,0]);
    setGlobeZoom(1);
    setFlatZoom(1);
    setFlatPan({ x: 0, y: 0 });
  };

  const pointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: screenPoint(e)[0], y: screenPoint(e)[1], rotation: [...rotation], pan: { ...flatPan }, moved: false };
  };

  const pointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const point=screenPoint(e);
    const dx = point[0] - d.x;
    const dy = point[1] - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { d.moved = true; justDraggedRef.current = true; }
    pendingMoveRef.current = { dx, dy };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      const pending = pendingMoveRef.current;
      const drag = dragRef.current;
      rafRef.current = null;
      if (!pending || !drag) return;
      if (projectionMode === 'globe') {
        setRotation([drag.rotation[0] + pending.dx * 0.20 / camera.current.globeZoom, Math.max(-75, Math.min(75, drag.rotation[1] - pending.dy * 0.17 / camera.current.globeZoom)), 0]);
      } else {
        setFlatPan(boundPan({ x: drag.pan.x + pending.dx, y: drag.pan.y + pending.dy },camera.current.flatZoom));
      }
    });
  };

  const pointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    window.setTimeout(() => { justDraggedRef.current = false; }, 100);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const changeFlatZoom = (next:number,point:[number,number]=[W/2,H/2]) => {
    const current=camera.current,zoom=clampZoom(next,true);
    const pan=boundPan(zoomAtPoint(current.flatPan,current.flatZoom,zoom,point),zoom);
    camera.current={...current,flatZoom:zoom,flatPan:pan};
    setFlatPan(pan);setFlatZoom(zoom);
  };

  // Native non-passive handling keeps map gestures on the map. One update per
  // animation frame coalesces high-frequency trackpad events without losing deltas.
  useEffect(()=>{
    const svg=svgRef.current;if(!svg)return;
    const wheel=(e:WheelEvent)=>{
      if(e.deltaY===0||!Number.isFinite(e.deltaY))return;
      e.preventDefault();
      const matrix=svg.getScreenCTM();if(!matrix)return;
      const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
      pendingWheel.current.factor*=wheelZoomFactor(e.deltaY,e.deltaMode,zoomSensitivity);
      pendingWheel.current.point=[point.x,point.y];
      if(wheelFrame.current!==null)return;
      wheelFrame.current=requestAnimationFrame(()=>{
        wheelFrame.current=null;
        const {factor,point:anchor}=pendingWheel.current;pendingWheel.current.factor=1;
        if(projectionMode==='flat')changeFlatZoom(camera.current.flatZoom*factor,anchor);
        else {const zoom=clampZoom(camera.current.globeZoom*factor,false);camera.current.globeZoom=zoom;setGlobeZoom(zoom);}
      });
    };
    svg.addEventListener('wheel',wheel,{passive:false});
    return ()=>{svg.removeEventListener('wheel',wheel);if(wheelFrame.current!==null)cancelAnimationFrame(wheelFrame.current);wheelFrame.current=null;pendingWheel.current.factor=1;};
  },[projectionMode,zoomSensitivity,Boolean(geojson)]);

  const screenPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    const matrix=e.currentTarget.getScreenCTM();
    if(!matrix)return [NaN,NaN] as MapPoint;
    const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    return [point.x,point.y] as MapPoint;
  };

  const selectFromSurface = (e: React.MouseEvent<SVGSVGElement>) => {
    const currentProjection=projection;
    const currentGeojson=geojson;
    if (justDraggedRef.current || !currentProjection || !currentGeojson || !currentProjection.invert) return;
    const clickScreen=screenPoint(e);
    if(!clickScreen.every(Number.isFinite))return;
    const micro=nearestMapMarker(visibleMarkers,clickScreen);
    if(micro){
      selectCountry(micro.id);
      setMapNotice(`${countries[micro.id].name} selected — microstate command profile loaded.`);
      return;
    }
    let [x,y]=clickScreen;
    if(projectionMode==='globe'&&Math.hypot(x-W/2,y-(H/2+8))>286*globeZoom){
      selectCountry(null);setHovered(null);setMapNotice('Open space — no sovereign state selected.');return;
    }
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
    selectCountry(null);
    setHovered(null);
    setMapNotice('Open waters — no sovereign state selected.');
  };

  const zoomBy=(factor:number)=>{
    if(projectionMode==='globe')setGlobeZoom(z=>clampZoom(z*factor,false));
    else changeFlatZoom(camera.current.flatZoom*factor);
  };

  const focusSelected=()=>{
    if(!selectedCountry||!geojson)return;
    const feature=geojson.features.find(f=>String(f.properties?.iso_a3??'')===selectedCountry.id);
    const anchor=countryMapAnchor(selectedCountry.id,feature);
    if(!anchor)return;
    const [lon,lat]=anchor;
    if(projectionMode==='globe'){setRotation([-lon,-lat,0]);setGlobeZoom(z=>Math.max(1.55,z));}
    else{
      const base=geoNaturalEarth1().fitExtent([[34,34],[W-34,H-34]],geojson as any).precision(.25);
      const p=base([lon,lat]); if(!p)return;
      const z=Math.max(2.4,flatZoom); setFlatZoom(z); setFlatPan({x:-z*(p[0]-W/2),y:-z*(p[1]-H/2)});
    }
  };

  useEffect(()=>{
    if(!mapControlCommand)return;
    if(mapControlCommand.action==='zoomIn')zoomBy(1.18);
    else if(mapControlCommand.action==='zoomOut')zoomBy(1/1.18);
    else if(mapControlCommand.action==='focus')focusSelected();
    else if(mapControlCommand.action==='reset')resetView();
  },[mapControlCommand?.nonce]);

  if (!geojson || !projection || !path) return <div className="world-map political-map"><div className="map-loading">INITIALIZING WORLD GEOMETRY…</div></div>;

  const shapeLayer = featureMetrics.map(({feature,id,d},index) => {
    const country = countries[id];
    if (!d) return null;
    const isSelected = id === selectedCountryId;
    const isHovered = id === hovered;
    const terrain=country?terrainForCountry(country):'plains';
    const fill=mapPresentation==='geographic'&&mapMode==='political'?`url(#terrain-${terrain})`:colorFor(id);
    return <path key={`${id}-${index}`} d={d} className={`country-shape ${photographic?(surfaceReady?'geographic photographic':'geographic'):''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`} fill={fill} onPointerEnter={() => country && setHovered(id)} onPointerLeave={() => setHovered((v) => v === id ? null : v)}><title>{country?.name ?? feature.properties?.name}</title></path>;
  });


  const labelCandidates:ScreenLabelCandidate[]=[];
  const revealThreshold=labelRevealThreshold(mapZoom,projectionMode==='flat');

  for(const {id,anchor:centroid,area:baseArea,d} of countryLabelMetrics){
    const country=countries[id];
    if(!country||MICROSTATE_POINTS[id as keyof typeof MICROSTATE_POINTS])continue;
    if(!d||!centroid)continue;
    if(projectionMode==='globe'&&geoDistance(centroid,globeCenter)>Math.PI/2)continue;
    const p=projectToScreen(centroid);
    if(!p)continue;
    const screenArea=baseArea*(projectionMode==='flat'?flatZoom*flatZoom:1);
    const forced=id===selectedCountryId;
    if(!forced&&id!==hovered&&id!==playerCountryId&&screenArea<revealThreshold)continue;
    const priority=screenArea
      +(id===playerCountryId?8500:0)
      +(id===hovered?7000:0)
      +(forced?20000:0)
      +country.demographics.population/2_000_000;
    labelCandidates.push({
      id,
      text:country.name.toUpperCase(),
      x:p[0],
      y:p[1],
      fontSize:(forced?Math.min(16,13.5+(mapZoom>=2?1:0)):labelFontSize(screenArea,mapZoom))*labelScale,
      priority,
      force:forced,
      className:forced?'country-map-label selected-screen-label':'country-map-label',
    });
  }

  for(const label of WATER_LABELS){
    if(label.minZoom&&mapZoom<label.minZoom)continue;
    if(projectionMode==='globe'&&geoDistance(label.position,globeCenter)>Math.PI/2)continue;
    const p=projectToScreen(label.position);
    if(!p)continue;
    labelCandidates.push({
      id:'water-'+label.name,
      text:label.name,
      x:p[0],
      y:p[1],
      fontSize:label.major?10.5:9.5,
      priority:label.major?-120:-180,
      className:label.major?'water-label major':'water-label',
    });
  }

  for(const {id,point} of visibleMarkers){
    const selected=id===selectedCountryId;
    if(!selected&&id!==hovered&&id!==playerCountryId&&mapZoom<4)continue;
    labelCandidates.push({id,text:countries[id].name.toUpperCase(),x:point[0],y:point[1]-14,
      fontSize:11*labelScale,priority:selected?100000:id===hovered?90000:8500,force:selected,
      className:selected?'country-map-label selected-screen-label':'country-map-label'});
  }
  const screenLabels=layoutScreenLabels(labelCandidates,{width:W,height:H},{
    padding:projectionMode==='flat'?5.5:4.5,
    maxCount:maxCountryLabels(mapZoom,projectionMode==='flat')+WATER_LABELS.length,
    margin:10,
  });

  const microstateMarkers=visibleMarkers.map(({id,point})=>{
    const selected=id===selectedCountryId;
    return <g key={id} className={`microstate-point screen-microstate ${selected?'selected':''}`} transform={`translate(${point[0]},${point[1]})`} onPointerEnter={()=>setHovered(id)} onPointerLeave={()=>setHovered(v=>v===id?null:v)}>
      <circle className="microstate-hit-target" r={12}/>
      <circle r={selected?5:3.5}/><title>{countries[id].name}</title>
    </g>;
  });

  return <div className="world-map political-map">
    <div className="map-hover-readout">
      <strong>{hoveredCountry?.name ?? selectedCountry?.name ?? 'WORLD COMMAND'}</strong>
      <span>{hoveredCountry ? `${hoveredCountry.region || 'Global'} · ${hoveredCountry.military.assessment.capability.toFixed(0)} MIL` : projectionMode === 'globe' ? 'drag globe · wheel zoom · click sovereign territory' : 'drag to pan · wheel zoom · click sovereign territory'}</span>
    </div>
    <svg ref={svgRef} data-zoom={mapZoom.toFixed(4)} aria-label="Interactive world map" viewBox={`0 0 ${W} ${H}`} className={projectionMode === 'globe' ? 'strategy-svg globe-svg' : 'strategy-svg flat-svg'} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onClick={selectFromSurface} shapeRendering="geometricPrecision">
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
      {photographic&&<GeographicSurface projection={projection} flat={projectionMode==='flat'} pan={flatPan} zoom={flatZoom} onReady={()=>setSurfaceReady(true)}/>}
      <g key={viewportKey} className="map-viewport" transform={projectionMode === 'flat' ? flatTransform : undefined}>
        <g className="country-layer">{shapeLayer}</g>
      </g>
      <g className="screen-label-layer" pointerEvents="none">
        {screenLabels.map(label=><text key={label.id} x={label.x} y={label.y} className={label.className} style={{fontSize:label.fontSize}}>{label.text}</text>)}
      </g>
      <g className="screen-microstate-layer">{microstateMarkers}</g>
    </svg>
    <div className="map-camera-hud" aria-label="Map camera controls">
      <button aria-label="Zoom out" disabled={mapZoom<=(projectionMode==='flat'?1:.72)} onClick={()=>zoomBy(1/1.18)}>−</button>
      <output aria-label="Map zoom level">{Math.round(mapZoom*100)}%</output>
      <button aria-label="Zoom in" disabled={mapZoom>=(projectionMode==='flat'?12:6)} onClick={()=>zoomBy(1.18)}>+</button>
      <i/>
      <button className="camera-reset" onClick={resetView} title="Reset camera">RESET</button>
    </div>
  </div>;
}
