import {MapControlIcon} from '../ui/icons/MapControlIcon';
import {displayCountries} from '../presentation/countryIdentity';
import {dominantResources} from './resourceBadges';
import {ResourceMapBadge} from '../ui/icons/ResourceMapBadge';
import {sovereignId} from '../domain/sovereignty';
import {LocaleText,translateLive} from '../i18n/localeText';
import {boundPan,clampZoom,wheelZoomFactor,zoomAtPoint} from './cameraControls';
import {GeographicSurface} from './GeographicSurface';
import {useMapDesk} from '../presentation/mapDeskSettings';
import {toViewBox,untilt} from './deskTilt';
import {capitalPins,capitalPinScale} from './capitalPins';
import {flagEmoji} from '../data/countryThemes';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { geoArea, geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath } from 'd3-geo';
import { countryMapAnchor, microstateVisible, nearestMapMarker, type MapPoint } from './mapCoordinates';
import { findCountryAtGeoPoint } from './mapSelection';
import { eventPins } from './eventPins';
import { CAPITAL_POSITIONS } from '../data/capitalPositions';
import { labelFontSize, labelRevealThreshold, layoutScreenLabels, maxCountryLabels, type ScreenLabelCandidate } from './labelLayout';
import { useGameStore } from '../store/gameStore';
import { calculateMilitaryPower } from '../store/selectors';
import { MICROSTATE_POINTS } from '../data/microstates';
import { terrainForCountry } from '../engine/systems/warfare';
import { FlightLayer, FlightTransit, type FlightProjector } from './FlightLayer';
import { visibleOnGlobe } from './flightPath';
import { connectionIndex } from './connectionIndex';

const W = 1200;
const H = 700;
const RELIEF_SRC = '/assets/geography/hillshade-2048.webp';
// The relief layer must never delay the Blue Marble surface's own ready flag.
const noop = () => {};

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

function WorldMapView() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [geojsonError, setGeojsonError] = useState(false);
  const [geojsonAttempt, setGeojsonAttempt] = useState(0);
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

  const embassies=useGameStore(s=>s.embassies),tradeDeals=useGameStore(s=>s.tradeDeals),contracts=useGameStore(s=>s.industrialContracts);
  const countries = displayCountries(useGameStore((s) => s.countries));
  const wars = useGameStore((s) => s.wars);
  const openWarWindow = useGameStore((s) => s.openWarWindow);
  const industrialEconomy = useGameStore(s=>s.industrialEconomy);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const zoomSensitivity=useGameStore(s=>s.mapZoomSensitivity);
  const labelScale = useGameStore((s) => s.mapLabelScale);
  const [surfaceReady,setSurfaceReady]=useState(false);
  const reliefOn=useMapDesk(s=>s.relief),pinsOn=useMapDesk(s=>s.pins);
  const mapMode = useGameStore((s) => s.mapMode);
  const mapPresentation = useGameStore((s) => s.mapPresentation);
  const projectionMode = useGameStore((s) => s.mapProjection);
  const mapControlCommand = useGameStore((s)=>s.mapControlCommand);
  const playerCountryId = useGameStore((s) => s.playerCountryId);
  const connections=useMemo(()=>mapMode==='relations'?connectionIndex(playerCountryId,tradeDeals,contracts,embassies):null,[mapMode,playerCountryId,tradeDeals,contracts,embassies]);
  const selectCountry = useGameStore((s) => s.selectCountry);
  const setMapNotice = useGameStore((s) => s.setMapNotice);

  // Desk tilt (playtest.17): flat map only, desktop widths only (matches the max-width:760px rule in mapDesk0917.css); the globe stays upright.
  const tiltOn=useMapDesk(s=>s.tilt);
  const [wide,setWide]=useState(()=>typeof window.matchMedia!=='function'||window.matchMedia('(min-width: 761px)').matches);
  useEffect(()=>{
    if(typeof window.matchMedia!=='function')return;
    const query=window.matchMedia('(min-width: 761px)'),update=()=>setWide(query.matches);
    update();query.addEventListener('change',update);
    return()=>query.removeEventListener('change',update);
  },[]);
  const deskTiltActive=tiltOn&&projectionMode==='flat'&&wide;
  // Read through a ref so the native wheel listener, which is not re-created on every render, never sees a stale value.
  const deskTiltRef=useRef(deskTiltActive);
  deskTiltRef.current=deskTiltActive;
  // Client point -> viewBox units. getScreenCTM() is a 2D affine matrix and cannot express the tilt's CSS perspective,
  // so a tilted map un-projects analytically (deskTilt.ts). Used by clicks, drag and the wheel zoom anchor alike.
  const toMapPoint=(clientX:number,clientY:number):MapPoint=>{
    const svg=svgRef.current;
    if(!svg)return [NaN,NaN];
    if(deskTiltRef.current&&svg.parentElement){
      const box=svg.parentElement.getBoundingClientRect();
      const [lx,ly]=untilt(clientX-box.left,clientY-box.top,box.width,box.height);
      return toViewBox(lx,ly,box.width,box.height);
    }
    const matrix=svg.getScreenCTM();
    if(!matrix)return [NaN,NaN];
    const point=new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse());
    return [point.x,point.y];
  };

  useEffect(() => {
    let alive = true;
    setGeojsonError(false);
    fetch('/data/countries.geojson').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((data) => { if (alive) setGeojson(data); }).catch((error) => { console.warn('World geometry failed to load:', error); if (alive) setGeojsonError(true); });
    return () => { alive = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [geojsonAttempt]);

  const projection = useMemo(() => {
    if (!geojson) return null;
    if (projectionMode === 'flat') return geoNaturalEarth1().fitExtent([[34,34],[W-34,H-34]], geojson as any).precision(0.25);
    return geoOrthographic().translate([W/2,H/2+8]).scale(286 * globeZoom).rotate(rotation).clipAngle(89.999).precision(0.25);
  }, [geojson, projectionMode, rotation, globeZoom]);

  const path = useMemo(() => projection ? geoPath(projection) : null, [projection]);
  const geographicMetrics=useMemo(()=>geojson?.features.map(feature=>{const id=String(feature.properties?.iso_a3??''),anchor=countryMapAnchor(id,feature);return {feature,id,anchor,sphericalArea:geoArea(feature as any)};})??[],[geojson]);
  const featureMetrics = useMemo(() => path&&projection ? geographicMetrics.map(metric => ({
    ...metric,
    area: projectionMode==='flat'?path.area(metric.feature as any):metric.sphericalArea*projection.scale()**2*Math.max(.1,Math.cos(geoDistance(metric.anchor??[0,0],[-rotation[0],-rotation[1]]))),
    d: path(metric.feature as any) ?? '',
  })) : [], [geographicMetrics,path,projectionMode,projection]);
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
    const country = countries[sovereignId(countries,id)];
    if (!country) return '#1d3240';
    const relation = player?.diplomacy.relations[country.id];
    const controlled = country.controllerCountryId === player?.id;
    if (mapMode === 'political') return country.id === player?.id || controlled ? '#d9ad48' : stablePoliticalColor(country.id);
    if (mapMode==='relations'){if(country.id===player.id)return '#edc570';return connections?.tradePartners.has(id)?'#4ca775':connections?.embassyPartners.has(id)?'#599fc9':relation?.treaties.includes('nonAggression')?'#ac82cb':relation?.treaties.includes('trade')?'#ccab5d':relation?.treaties.includes('alliance')?'#77c7b5':(relation?.score??0)<=-50?'#ce7075':(relation?.score??0)>=20?'#8fbc8b':'#526f80';}
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

  const photographic=mapPresentation==='geographic';
  const hoveredCountry = hovered ? countries[sovereignId(countries,hovered)] : null;
  const selectedCountry = selectedCountryId ? countries[selectedCountryId] : null;
  const flatTransform = `translate(${flatPan.x} ${flatPan.y}) translate(${W/2} ${H/2}) scale(${flatZoom}) translate(${-W/2} ${-H/2})`;
  const projectToScreen=(position:[number,number])=>{
    const p=projection?.(position);
    if(!p)return null;
    if(projectionMode==='flat')return [flatPan.x+W/2+flatZoom*(p[0]-W/2),flatPan.y+H/2+flatZoom*(p[1]-H/2)] as [number,number];
    return p as [number,number];
  };
  // 0.89 flights: screen position of a geographic point, or null when it is on the far side of the globe.
  const flightProjector=useMemo<FlightProjector>(()=>position=>{
    if(!projection||(projectionMode==='globe'&&!visibleOnGlobe(position,[-rotation[0],-rotation[1]])))return null;
    const p=projection(position);
    if(!p)return null;
    return projectionMode==='flat'?[flatPan.x+W/2+flatZoom*(p[0]-W/2),flatPan.y+H/2+flatZoom*(p[1]-H/2)]:[p[0],p[1]];
  },[projection,projectionMode,rotation,flatPan,flatZoom]);
  const mapZoom=projectionMode==='globe'?globeZoom:flatZoom;
  const globeCenter:MapPoint=[-rotation[0],-rotation[1]];
  // Capital pins (playtest.17): which pins to draw is decided by the pure capitalPins(); the layer below only renders them.
  const embassyPartners=useMemo(()=>connectionIndex(playerCountryId,{},{},embassies).embassyPartners,[playerCountryId,embassies]);
  const pins=useMemo(()=>pinsOn?capitalPins({countries,playerCountryId,selectedCountryId,hovered,project:flightProjector,zoom:mapZoom,flat:projectionMode==='flat',embassyPartners}):[],[pinsOn,countries,playerCountryId,selectedCountryId,hovered,flightProjector,mapZoom,projectionMode,embassyPartners]);
  // Event pins (playtest.19): crossed swords on active wars, a megaphone on domestic unrest. Click handling goes through the same nearest-marker path as microstates, so pointer capture never swallows it.
  const eventMarkers=useMemo(()=>eventPins({wars,countries,playerCountryId,capitals:CAPITAL_POSITIONS,project:flightProjector,width:W,height:H}),[wars,countries,playerCountryId,flightProjector]);
  const visibleMarkers=Object.entries(MICROSTATE_POINTS).flatMap(([id,position])=>{
    if(!countries[id]||countries[id].annexedBy||!microstateVisible(mapZoom,projectionMode==='flat',id===selectedCountryId,id===hovered,id===playerCountryId))return [];
    if(projectionMode==='globe'&&geoDistance(position,globeCenter)>Math.PI/2)return [];
    const point=projectToScreen(position);
    if(!point||point[0]<0||point[0]>W||point[1]<0||point[1]>H)return [];
    return [{id,point}];
  });

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
      const point=toMapPoint(e.clientX,e.clientY);if(!point.every(Number.isFinite))return;
      pendingWheel.current.factor*=wheelZoomFactor(e.deltaY,e.deltaMode,zoomSensitivity);
      pendingWheel.current.point=point;
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

  const screenPoint = (e: React.MouseEvent<SVGSVGElement>) => toMapPoint(e.clientX,e.clientY);

  const selectFromSurface = (e: React.MouseEvent<SVGSVGElement>) => {
    const currentProjection=projection;
    const currentGeojson=geojson;
    if (justDraggedRef.current || !currentProjection || !currentGeojson || !currentProjection.invert) return;
    const clickScreen=screenPoint(e);
    if(!clickScreen.every(Number.isFinite))return;
    const eventHit=nearestMapMarker(eventMarkers.map(p=>({id:p.id,point:p.point})),clickScreen,14);
    if(eventHit){
      const pin=eventMarkers.find(p=>p.id===eventHit.id)!;
      if(pin.kind==='war')openWarWindow(pin.target);else selectCountry(pin.target);
      return;
    }
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
      const country=countries[sovereignId(countries,polygonId)];
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

  const focusCountry=(country=selectedCountry)=>{
    if(!country||!geojson)return;
    const feature=geojson.features.find(f=>String(f.properties?.iso_a3??'')===country.id);
    const anchor=countryMapAnchor(country.id,feature);
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
    else if(mapControlCommand.action==='focus')focusCountry();
    else if(mapControlCommand.action==='home')focusCountry(countries[playerCountryId]);
    else if(mapControlCommand.action==='reset')resetView();
  },[mapControlCommand?.nonce]);

  if (!geojson && geojsonError) return <div className="world-map political-map"><div className="map-loading" role="alert"><LocaleText value={"WORLD GEOMETRY FAILED TO LOAD"}/> <button type="button" onClick={() => setGeojsonAttempt((n) => n + 1)}><LocaleText value={"RETRY"}/></button></div></div>;
  if (!geojson || !projection || !path) return <div className="world-map political-map"><div className="map-loading"><LocaleText value={"INITIALIZING WORLD GEOMETRY…"}/></div></div>;

  const shapeLayer = featureMetrics.map(({feature,id,d},index) => {
    const country = countries[sovereignId(countries,id)];
    if (!d) return null;
    const isSelected = sovereignId(countries,id) === selectedCountryId;
    const isHovered = id === hovered;
    const terrain=country?terrainForCountry(country):'plains';
    const fill=mapPresentation==='geographic'&&mapMode==='political'?`url(#terrain-${terrain})`:colorFor(id);
    return <path key={`${id}-${index}`} d={d} className={`country-shape ${photographic?(surfaceReady?`geographic photographic ${mapMode==='political'?'surface-only':'surface-overlay'}`:'geographic'):''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`} fill={fill} onPointerEnter={() => country && setHovered(id)} onPointerLeave={() => setHovered((v) => v === id ? null : v)}><title><LocaleText value={country?.name ?? feature.properties?.name}/></title></path>;
  });


  const labelCandidates:ScreenLabelCandidate[]=[];
  const revealThreshold=labelRevealThreshold(mapZoom,projectionMode==='flat');

  for(const {id,anchor:centroid,area:baseArea,d} of countryLabelMetrics){
    const country=countries[sovereignId(countries,id)];
    if(!country||countries[id]?.annexedBy||MICROSTATE_POINTS[id as keyof typeof MICROSTATE_POINTS])continue;
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
      text:translateLive(country.name).toLocaleUpperCase(),
      extraHeight:mapMode==='resources'?28:0,
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
      <circle r={selected?5:3.5}/><title><LocaleText value={countries[id].name}/></title>
    </g>;
  });

  return <div className={`world-map political-map${deskTiltActive?' desk-tilt':''}`}>
    <div className="map-hover-readout">
      <strong><LocaleText value={hoveredCountry?.name ?? selectedCountry?.name ?? 'WORLD COMMAND'}/></strong>
      <span><LocaleText value={hoveredCountry ? `${hoveredCountry.region || 'Global'} · ${hoveredCountry.military.assessment.capability.toFixed(0)} MIL` : projectionMode === 'globe' ? 'drag globe · wheel zoom · click sovereign territory' : 'drag to pan · wheel zoom · click sovereign territory'}/></span>
    </div>
    {mapMode==='relations'&&<div className="connections-legend"><span>● <LocaleText value="Active trade"/></span><span>● <LocaleText value="Embassy"/></span><span>● <LocaleText value="Non-aggression"/></span><span>● <LocaleText value="Trade pact"/></span><span>● <LocaleText value="Alliance treaty"/></span><span>● <LocaleText value="Friendly relations"/></span><span>● <LocaleText value="Hostile relations"/></span><small><LocaleText value="A country may have several connections; select it to inspect all agreements."/></small></div>}
    <p id="map-keyboard-help" className="map-keyboard-hint"><LocaleText value="Arrow keys: move · + / −: zoom · Home: your country · Enter: open country"/></p>
    <svg tabIndex={0} role="group" aria-describedby="map-keyboard-help" onKeyDown={e=>{
      if(e.target!==e.currentTarget||e.altKey||e.ctrlKey||e.metaKey)return;
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_','Home','Enter'].includes(e.key))return;
      e.preventDefault();
      if(e.key==='Home'){focusCountry(countries[playerCountryId]);return;}
      if(e.key==='Enter'){selectCountry(selectedCountryId??playerCountryId);return;}
      if(['+','=','-','_'].includes(e.key)){zoomBy(['+','='].includes(e.key)?1.18:1/1.18);return;}
      const dx=e.key==='ArrowLeft'?-40:e.key==='ArrowRight'?40:0,dy=e.key==='ArrowUp'?-40:e.key==='ArrowDown'?40:0;
      if(projectionMode==='globe')setRotation(r=>[r[0]+dx*.2/globeZoom,Math.max(-75,Math.min(75,r[1]-dy*.17/globeZoom)),0]);
      else setFlatPan(p=>boundPan({x:p.x+dx,y:p.y+dy},flatZoom));
    }} ref={svgRef} data-zoom={mapZoom.toFixed(4)} aria-label={translateLive("Interactive world map")} viewBox={`0 0 ${W} ${H}`} className={projectionMode === 'globe' ? 'strategy-svg globe-svg' : 'strategy-svg flat-svg'} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onClick={selectFromSurface} shapeRendering="geometricPrecision">
      <defs>
        <pattern id="terrain-plains" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#6d8061"/><path d="M0 14C5 11 10 16 18 12" fill="none" stroke="#9aab83" strokeOpacity=".22" strokeWidth="1"/></pattern>
        <pattern id="terrain-forest" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#3f6b52"/><circle cx="3" cy="4" r="1.5" fill="#234936" fillOpacity=".65"/><circle cx="10" cy="9" r="1.7" fill="#2a513c" fillOpacity=".7"/></pattern>
        <pattern id="terrain-desert" width="20" height="16" patternUnits="userSpaceOnUse"><rect width="20" height="16" fill="#a88a5a"/><path d="M0 10Q5 6 10 10t10 0" fill="none" stroke="#d5bb7d" strokeOpacity=".35"/></pattern>
        <pattern id="terrain-mountain" width="22" height="20" patternUnits="userSpaceOnUse"><rect width="22" height="20" fill="#657065"/><path d="M1 17 7 6l4 7 4-9 6 13" fill="none" stroke="#aab0a4" strokeOpacity=".42" strokeWidth="1.1"/></pattern>
        <pattern id="terrain-urban" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#687077"/><path d="M0 8h16M8 0v16" stroke="#9da3a8" strokeOpacity=".18"/></pattern>
        <radialGradient id="globe-atmosphere"><stop offset=".9" stopColor="#7fb8d4" stopOpacity="0"/><stop offset=".945" stopColor="#8fc4dc" stopOpacity=".26"/><stop offset="1" stopColor="#8fc4dc" stopOpacity="0"/></radialGradient>
        <radialGradient id="globe-shade" cx=".38" cy=".32" r=".72"><stop offset="0" stopColor="#fff6dc" stopOpacity=".07"/><stop offset=".55" stopColor="#000" stopOpacity="0"/><stop offset="1" stopColor="#01070c" stopOpacity=".38"/></radialGradient>
        <pattern id="terrain-coastal" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#53796c"/><path d="M0 5c5 3 9-3 18 0M0 12c6 3 11-2 18 0" fill="none" stroke="#8fb6a8" strokeOpacity=".26"/></pattern>
        {/* Original miniature capitol (domed, columned front) for the capital pins. Three flat colours, 1 px dark outline. */}
        <symbol id="capital-building" viewBox="0 0 14 14">
          <g stroke="#1b2a33" strokeWidth=".9" strokeLinejoin="round">
            <rect x="1" y="11.6" width="12" height="1.9" fill="#b8ab8a"/>
            <rect x="2.2" y="7.6" width="9.6" height="4" fill="#efe6cf"/>
            <path d="M11.8 7.6l1.2.9v3.1l-1.2 0z" fill="#b8ab8a"/>
            <path d="M1.4 7.6 7 4.7l5.6 2.9z" fill="#b8ab8a"/>
            <path d="M4.6 4.7a2.4 2.4 0 0 1 4.8 0z" fill="#d9ad48"/>
          </g>
          <path d="M4.3 8.3v3M6.1 8.3v3M7.9 8.3v3M9.7 8.3v3" stroke="#b8ab8a" strokeWidth=".8" fill="none"/>
          <path d="M7 .8v1.5" stroke="#1b2a33" strokeWidth=".8"/>
        </symbol>
        <clipPath id="capital-flag-clip"><circle r="7" cy="-22"/></clipPath>
      </defs>
      {projectionMode === 'flat' && <rect x="0" y="0" width={W} height={H} className="flat-ocean"/>}
      {projectionMode === 'globe' && <>
        <circle cx={W/2} cy={H/2+8} r={286*globeZoom*1.06} fill="url(#globe-atmosphere)" className="globe-atmosphere" pointerEvents="none"/>
        <path d={path({ type: 'Sphere' } as any) ?? ''} className="ocean-sphere"/>
        <path d={path(graticule as any) ?? ''} className="globe-graticule"/>
      </>}
      {photographic&&<GeographicSurface projection={projection} flat={projectionMode==='flat'} pan={flatPan} zoom={flatZoom} onReady={()=>setSurfaceReady(true)}/>}
      <g className="map-viewport" transform={projectionMode === 'flat' ? flatTransform : undefined}>
        <g className="country-layer">{shapeLayer}</g>
      </g>
      {reliefOn&&<g className={`relief-layer ${photographic?'over-surface':''}`} pointerEvents="none"><GeographicSurface variant="relief" src={RELIEF_SRC} projection={projection} flat={projectionMode==='flat'} pan={flatPan} zoom={flatZoom} onReady={noop}/></g>}
      {projectionMode === 'globe' && <circle cx={W/2} cy={H/2+8} r={286*globeZoom} fill="url(#globe-shade)" className="globe-shade" pointerEvents="none"/>}
      {pinsOn&&<g className="capital-pin-layer" pointerEvents="none" aria-hidden="true">
        {pins.map(pin=>{const iso2=countries[pin.id]?.iso2??'';return <g key={pin.id} className={`capital-pin role-${pin.role}`} transform={`translate(${pin.x},${pin.y}) scale(${pin.scale})`} data-capital={pin.id}>
          <use href="#capital-building" x={-7} y={-14} width={14} height={14}/>
          <circle className="capital-flag-ring" cy={-22} r={8}/>
          {iso2.length===2&&<text className="capital-flag" y={-18.5} textAnchor="middle" clipPath="url(#capital-flag-clip)">{flagEmoji(iso2)}</text>}
        </g>;})}
      </g>}
      {eventMarkers.length>0&&<g className="event-pin-layer" pointerEvents="none" aria-hidden="true">
        {eventMarkers.map(pin=><g key={pin.id} className={`event-pin kind-${pin.kind}`} transform={`translate(${pin.point[0]},${pin.point[1]}) scale(${capitalPinScale(mapZoom)})`} data-event={pin.id} data-kind={pin.kind}>
          <circle className="event-pin-pulse" r={13}/>
          <circle className="event-pin-disc" r={11}/>
          {pin.kind==='war'
            ?<g className="event-pin-art"><path d="M-6 -6 L6 6 M6 -6 L-6 6" /><path d="M-7.5 -3.5 L-3.5 -7.5 M7.5 -3.5 L3.5 -7.5" /></g>
            :<g className="event-pin-art"><path className="fill" d="M-6.5 -2.2 H-2.5 L5 -6.5 V6.5 L-2.5 2.2 H-6.5 Z"/><path d="M-4 2.5 L-3 7"/></g>}
        </g>)}
      </g>}
      <g className="screen-label-layer" pointerEvents="none">
        {screenLabels.map(label=><g key={label.id}><text x={label.x} y={label.y} className={label.className} style={{fontSize:label.fontSize}}><LocaleText value={label.text}/></text>{mapMode==='resources'&&countries[label.id]&&dominantResources(countries[label.id],industrialEconomy[label.id]).map((r,index,all)=><ResourceMapBadge key={r} resource={r} x={label.x+(index-(all.length-1)/2)*27-11} y={label.y+7}/>)}</g>)}
      </g>
      <FlightLayer project={flightProjector}/>
      <g className="screen-microstate-layer"><LocaleText value={microstateMarkers}/></g>
    </svg>
    <div className="map-camera-hud" aria-label={translateLive("Map camera controls")}>
      <button aria-label={translateLive("Zoom out")} disabled={mapZoom<=(projectionMode==='flat'?1:.72)} onClick={()=>zoomBy(1/1.18)}><MapControlIcon kind="zoomOut"/></button>
      <output aria-label={translateLive("Map zoom level")}><LocaleText value={Math.round(mapZoom*100)}/><LocaleText value={"%"}/></output>
      <button aria-label={translateLive("Zoom in")} disabled={mapZoom>=(projectionMode==='flat'?12:6)} onClick={()=>zoomBy(1.18)}><MapControlIcon kind="zoomIn"/></button>
      <button className="camera-home" aria-label={translateLive("Return to your nation")} title={translateLive("Return to your nation")} onClick={()=>focusCountry(countries[playerCountryId])}><MapControlIcon kind="home"/></button>
      <i/>
      <button className="camera-reset" onClick={resetView} title={translateLive("Reset camera")}><MapControlIcon kind="reset"/><LocaleText value={"RESET"}/></button>
      <FlightTransit/>
    </div>
  </div>;
}
// No props: memo stops parent (App) re-renders from re-running the map; store subscriptions still drive updates.
export const WorldMap = memo(WorldMapView);
