import {LocaleText,translateLive} from '../../i18n/localeText';
import type { MapMode } from '../../domain/map';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { useMapDesk } from '../../presentation/mapDeskSettings';

const modes:Array<{mode:MapMode;key:string;glyph:string}>=[
 {mode:'political',key:'political',glyph:'◉'},
 {mode:'relations',key:'connections',glyph:'↔'},
 {mode:'diplomacy',key:'diplomacy',glyph:'◇'},
 {mode:'resources',key:'resources',glyph:'⬡'},
 {mode:'military',key:'military',glyph:'◆'},
 {mode:'religion',key:'religion',glyph:'✦'},
 {mode:'ideology',key:'ideology',glyph:'▣'},
];

export function MapModeBar(){
 const zoomSpeed=useGameStore(s=>s.mapZoomSensitivity);
 const setZoomSpeed=useGameStore(s=>s.setMapZoomSensitivity);
 const labelScale=useGameStore(s=>s.mapLabelScale);
 const setLabelScale=useGameStore(s=>s.setMapLabelScale);
 const mapMode=useGameStore(s=>s.mapMode);
 const setMapMode=useGameStore(s=>s.setMapMode);
 const mapNotice=useGameStore(s=>s.mapNotice);
 const lang=useGameStore(s=>s.playerProfile.language);
 const mapPresentation=useGameStore(s=>s.mapPresentation);
 const setMapPresentation=useGameStore(s=>s.setMapPresentation);
 const projection=useGameStore(s=>s.mapProjection);
 const setProjection=useGameStore(s=>s.setMapProjection);
 const issueMapControl=useGameStore(s=>s.issueMapControl);
 const selectedCountryId=useGameStore(s=>s.selectedCountryId);
 const deskTilt=useMapDesk(s=>s.tilt),deskRelief=useMapDesk(s=>s.relief),deskPins=useMapDesk(s=>s.pins),setDesk=useMapDesk(s=>s.set);
 return <section className="map-mode-bar" aria-label={translateLive("Map modes")}>
  <header className="map-mode-heading"><span><small><LocaleText value={"STRATEGIC VIEW"}/></small><strong><LocaleText value={"MAP COMMAND"}/></strong></span><em><LocaleText value={mapMode.toUpperCase()}/></em></header>
  <div className="map-mode-buttons">{modes.map(({mode,key,glyph})=><button key={mode} className={mode===mapMode?'active':''} onClick={()=>setMapMode(mode)}><span><LocaleText value={glyph}/></span><LocaleText value={mode==='relations'?'RELATIONS':tr(lang,key)}/></button>)}</div>
  {mapMode==='relations'&&<div className="relations-legend"><span><LocaleText value={"HOSTILE −100"}/></span><span><LocaleText value={"NEUTRAL 0"}/></span><span><LocaleText value={"FRIENDLY +100"}/></span></div>}
  <div className="map-command-sections">
   <div><small><LocaleText value={"BASE MAP"}/></small><span><button className={mapPresentation==='political'?'active':''} onClick={()=>setMapPresentation('political')}><LocaleText value={tr(lang,'political')}/></button><button className={mapPresentation==='geographic'?'active':''} onClick={()=>setMapPresentation('geographic')}><LocaleText value={tr(lang,'geographic')}/></button></span></div>
   <div><small><LocaleText value={"PROJECTION"}/></small><span><button className={projection==='globe'?'active':''} onClick={()=>setProjection('globe')}><LocaleText value={"GLOBE"}/></button><button className={projection==='flat'?'active':''} onClick={()=>setProjection('flat')}><LocaleText value={"FLAT"}/></button></span></div>
   <div><small><LocaleText value={"CAMERA"}/></small><span className="map-camera-actions"><button onClick={()=>issueMapControl('zoomOut')}><LocaleText value={"−"}/></button><button onClick={()=>issueMapControl('zoomIn')}><LocaleText value={"+"}/></button><button disabled={!selectedCountryId} onClick={()=>issueMapControl('focus')}><LocaleText value={"FOCUS"}/></button><button onClick={()=>issueMapControl('home')}><LocaleText value="My nation"/></button><button onClick={()=>issueMapControl('reset')}><LocaleText value={"RESET"}/></button></span></div>
  </div>
  <label className="map-label-control"><LocaleText value={"ZOOM SPEED "}/><input aria-label={translateLive("Map zoom speed")} type="range" min="0.3" max="1.5" step="0.05" value={zoomSpeed} onChange={e=>setZoomSpeed(Number(e.target.value))}/><output><LocaleText value={zoomSpeed<.5?'SLOW':zoomSpeed>.9?'FAST':'NORMAL'}/></output></label>
  <label className="map-label-control"><LocaleText value={"LABEL SIZE "}/><input aria-label={translateLive("Map label size")} type="range" min="0.85" max="1.4" step="0.05" value={labelScale} onChange={e=>setLabelScale(Number(e.target.value))}/><output><LocaleText value={Math.round(labelScale*100)}/><LocaleText value={"%"}/></output></label>
  <div className="map-desk-controls">
   <label title={translateLive("Applies to the flat map on wide screens")}><input type="checkbox" checked={deskTilt} onChange={e=>setDesk({tilt:e.target.checked})}/><LocaleText value={"Desk tilt"}/></label>
   <label><input type="checkbox" checked={deskRelief} onChange={e=>setDesk({relief:e.target.checked})}/><LocaleText value={"Relief shading"}/></label>
   <label><input type="checkbox" checked={deskPins} onChange={e=>setDesk({pins:e.target.checked})}/><LocaleText value={"Capital pins"}/></label>
   {deskRelief&&<small className="map-desk-credit"><LocaleText value={"Shaded relief: Natural Earth (public domain)"}/></small>}
  </div>
  <div className="map-notice"><LocaleText value={mapNotice}/></div>
 </section>;
}
