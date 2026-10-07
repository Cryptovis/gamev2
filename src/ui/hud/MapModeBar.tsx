import type { MapMode } from '../../domain/map';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';

const modes:Array<{mode:MapMode;key:string;glyph:string}>=[
 {mode:'political',key:'political',glyph:'◉'},
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
 return <section className="map-mode-bar" aria-label="Map modes">
  <header className="map-mode-heading"><span><small>STRATEGIC VIEW</small><strong>MAP COMMAND</strong></span><em>{mapMode.toUpperCase()}</em></header>
  <div className="map-mode-buttons">{modes.map(({mode,key,glyph})=><button key={mode} className={mode===mapMode?'active':''} onClick={()=>setMapMode(mode)}><span>{glyph}</span>{tr(lang,key)}</button>)}</div>
  <div className="map-command-sections">
   <div><small>BASE MAP</small><span><button className={mapPresentation==='political'?'active':''} onClick={()=>setMapPresentation('political')}>{tr(lang,'political')}</button><button className={mapPresentation==='geographic'?'active':''} onClick={()=>setMapPresentation('geographic')}>{tr(lang,'geographic')}</button></span></div>
   <div><small>PROJECTION</small><span><button className={projection==='globe'?'active':''} onClick={()=>setProjection('globe')}>GLOBE</button><button className={projection==='flat'?'active':''} onClick={()=>setProjection('flat')}>FLAT</button></span></div>
   <div><small>CAMERA</small><span className="map-camera-actions"><button onClick={()=>issueMapControl('zoomOut')}>−</button><button onClick={()=>issueMapControl('zoomIn')}>+</button><button disabled={!selectedCountryId} onClick={()=>issueMapControl('focus')}>FOCUS</button><button onClick={()=>issueMapControl('reset')}>RESET</button></span></div>
  </div>
  <label className="map-label-control">ZOOM SPEED <input aria-label="Map zoom speed" type="range" min="0.3" max="1.5" step="0.05" value={zoomSpeed} onChange={e=>setZoomSpeed(Number(e.target.value))}/><output>{zoomSpeed<.5?'SLOW':zoomSpeed>.9?'FAST':'NORMAL'}</output></label>
  <label className="map-label-control">LABEL SIZE <input aria-label="Map label size" type="range" min="0.85" max="1.4" step="0.05" value={labelScale} onChange={e=>setLabelScale(Number(e.target.value))}/><output>{Math.round(labelScale*100)}%</output></label>
  <div className="map-notice">{mapNotice}</div>
 </section>;
}
