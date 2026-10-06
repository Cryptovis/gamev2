import { useEffect, useMemo, useRef, useState } from 'react';
import { geoCentroid, geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath } from 'd3-geo';
import { useGameStore } from '../store/gameStore';
import { calculateMilitaryPower } from '../store/selectors';
import { MICROSTATE_POINTS } from '../data/microstates';

const W = 1200;
const H = 700;

type ProjectionMode = 'globe' | 'flat';
type Feature = { type: 'Feature'; geometry: any; properties: { iso_a3?: string; name?: string } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };
type DragState = { x: number; y: number; rotation: [number, number, number]; pan: { x: number; y: number }; moved: boolean };

const politicalPalette = ['#355f72','#466c63','#6d5f4d','#5d5575','#7b5660','#4d6675','#4e7361','#7a653f','#4f6072','#65704a','#70554f','#467077'];
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
  const dragRef = useRef<DragState | null>(null);
  const justDraggedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ dx: number; dy: number } | null>(null);

  const countries = useGameStore((s) => s.countries);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const mapMode = useGameStore((s) => s.mapMode);
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
    if (projectionMode === 'globe') setGlobeZoom((z) => Math.max(.72, Math.min(1.75, z + (e.deltaY < 0 ? .08 : -.08))));
    else setFlatZoom((z) => Math.max(1, Math.min(4.5, Number((z * (e.deltaY < 0 ? 1.12 : .89)).toFixed(3)))));
  };

  if (!geojson || !projection || !path) return <div className="world-map political-map"><div className="map-loading">INITIALIZING WORLD GEOMETRY…</div></div>;

  const shapeLayer = geojson.features.map((feature) => {
    const id = String(feature.properties?.iso_a3 ?? '');
    const country = countries[id];
    const d = path(feature as any) ?? '';
    if (!d) return null;
    const isSelected = id === selectedCountryId;
    const isHovered = id === hovered;
    return <path key={id || feature.properties?.name} d={d} className={`country-shape ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`} fill={colorFor(id)} onPointerEnter={() => country && setHovered(id)} onPointerLeave={() => setHovered((v) => v === id ? null : v)} onClick={(e) => {
      e.stopPropagation();
      if (justDraggedRef.current) return;
      if (country) { selectCountry(id); setMapNotice(`${country.name} selected — sovereign profile loaded.`); }
    }}><title>{country?.name ?? feature.properties?.name}</title></path>;
  });

  return <div className="world-map political-map">
    <div className="projection-switch" aria-label="Map projection">
      <button className={projectionMode === 'globe' ? 'active' : ''} onClick={() => setProjectionMode('globe')}>GLOBE</button>
      <button className={projectionMode === 'flat' ? 'active' : ''} onClick={() => setProjectionMode('flat')}>FLAT</button>
      <button onClick={resetView}>RESET</button>
    </div>
    <div className="map-hover-readout">
      <strong>{hoveredCountry?.name ?? selectedCountry?.name ?? 'WORLD COMMAND'}</strong>
      <span>{hoveredCountry ? `${hoveredCountry.region || 'Global'} · ${hoveredCountry.military.assessment.capability.toFixed(0)} MIL` : projectionMode === 'globe' ? 'drag globe · wheel zoom · click sovereign territory' : 'drag to pan · wheel zoom · click sovereign territory'}</span>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} className={projectionMode === 'globe' ? 'strategy-svg globe-svg' : 'strategy-svg flat-svg'} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} shapeRendering="geometricPrecision">
      {projectionMode === 'globe' && <>
        <path d={path({ type: 'Sphere' } as any) ?? ''} className="ocean-sphere"/>
        <path d={path(graticule as any) ?? ''} className="globe-graticule"/>
      </>}
      <g key={viewportKey} className="map-viewport" transform={projectionMode === 'flat' ? flatTransform : undefined}>
        <g className="country-layer">{shapeLayer}</g>
        {Object.entries(MICROSTATE_POINTS).map(([id,pos]) => {
          const c = countries[id]; if (!c) return null;
          if (projectionMode === 'globe') {
            const center: [number,number] = [-rotation[0],-rotation[1]];
            if (geoDistance(pos as [number,number], center) > Math.PI/2) return null;
          }
          const p = projection(pos as [number,number]); if (!p) return null;
          return <g key={id} className="microstate-point" transform={`translate(${p[0]},${p[1]})`} onClick={(e) => { e.stopPropagation(); if (!justDraggedRef.current) selectCountry(id); }}><circle r="5"/><text y="-9">{c.iso2}</text></g>;
        })}
        {selectedCountry && geojson.features.map((f) => String(f.properties?.iso_a3 ?? '') === selectedCountry.id ? f : null).filter(Boolean).map((f: any) => {
          const centroid = geoCentroid(f); const p = projection(centroid); if (!p) return null;
          if (projectionMode === 'globe') {
            const center: [number,number] = [-rotation[0],-rotation[1]];
            if (geoDistance(centroid, center) > Math.PI/2) return null;
          }
          return <g key="selected-label" transform={`translate(${p[0]},${p[1]})`} className="selected-map-label"><circle r="4"/><text y="-11">{selectedCountry.name.toUpperCase()}</text></g>;
        })}
      </g>
    </svg>
    <div className="map-legend"><span className="legend-dot player"></span>PLAYER <span className="legend-sep">·</span> {mapMode.toUpperCase()} MAP <span className="legend-sep">·</span> {projectionMode === 'flat' ? `${flatZoom.toFixed(1)}× MAP ZOOM` : `${globeZoom.toFixed(1)}× GLOBE`}</div>
  </div>;
}
