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
 const mapMode=useGameStore(s=>s.mapMode);
 const setMapMode=useGameStore(s=>s.setMapMode);
 const mapNotice=useGameStore(s=>s.mapNotice);
 const lang=useGameStore(s=>s.playerProfile.language);
 return <section className="map-mode-bar" aria-label="Map modes"><header className="map-mode-heading"><span><small>STRATEGIC VIEW</small><strong>MAP LAYERS</strong></span><em>{mapMode.toUpperCase()}</em></header><div className="map-mode-buttons">{modes.map(({mode,key,glyph})=><button key={mode} className={mode===mapMode?'active':''} onClick={()=>setMapMode(mode)}><span>{glyph}</span>{tr(lang,key)}</button>)}</div><div className="map-notice">{mapNotice}</div></section>;
}
