import {IndustrialPanel} from './IndustrialPanel';
import type { CountryState, EquipmentType } from '../../domain/game';
import { EQUIPMENT_CATALOG, EQUIPMENT_TYPES } from '../../data/equipmentCatalog';
import { militaryFactoryCapacity, strategicReserveScore } from '../../engine/systems/production';
import { useGameStore } from '../../store/gameStore';
import { ArtilleryIcon, FuelIcon, IndustryIcon, JetIcon, PersonnelIcon, ShipIcon, SteelIcon, TankIcon } from '../icons/GameIcons';

function EquipmentGlyph({type}:{type:EquipmentType}){
 if(type==='infantry_equipment')return <PersonnelIcon size={22}/>;
 if(type==='artillery')return <ArtilleryIcon size={22}/>;
 if(type==='armor')return <TankIcon size={22}/>;
 if(type==='fighters')return <JetIcon size={22}/>;
 if(type==='naval')return <ShipIcon size={22}/>;
 return <IndustryIcon size={22}/>;
}
const fmt=(v:number)=>v>=1_000_000?(v/1_000_000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(1)+'K':v>=100?Math.round(v).toLocaleString():v.toFixed(v<10?1:0);

export function ProductionPanel({country}:{country:CountryState}){
 const state=useGameStore();
 const production=state.production[country.id];
 const isPlayer=country.id===state.playerCountryId;
 if(!production)return <div className="production-empty">Production intelligence unavailable.</div>;

 const capacity=militaryFactoryCapacity(country,production);
 const assigned=EQUIPMENT_TYPES.reduce((sum,t)=>sum+production.lines[t].factories,0);
 const reserveScore=strategicReserveScore(state,country.id);
 const bottleneck=production.bottleneck==='none'?'CLEAR':production.bottleneck.toUpperCase();

 return <div className="production-panel">
  <IndustrialPanel country={country}/>
  <section className="production-hero">
   <div className="production-hero-title"><IndustryIcon size={28}/><span><small>NATIONAL INDUSTRIAL COMMAND</small><strong>Production & Equipment</strong><em>{isPlayer?'Allocate military industry and reinforce active forces.':'Observed production estimate based on known industrial capacity.'}</em></span></div>
   <div className="production-kpis">
    <span><small>MIL. FACTORIES</small><strong>{assigned}/{capacity}</strong></span>
    <span><small>THROUGHPUT</small><strong className={production.throughput<70?'negative':'positive'}>{production.throughput.toFixed(0)}%</strong></span>
    <span><small>RESERVE SCORE</small><strong>{reserveScore.toFixed(0)}</strong></span>
    <span><small>BOTTLENECK</small><strong className={production.bottleneck==='none'?'positive':'negative'}>{bottleneck}</strong></span>
   </div>
   {isPlayer&&<label className="military-share-control"><span><b>Military factory allocation</b><small>{production.militaryFactoryShare}% of usable factory capacity</small></span><input type="range" min="25" max="80" step="1" value={production.militaryFactoryShare} onChange={e=>state.setMilitaryFactoryShare(Number(e.target.value))}/><strong>{production.militaryFactoryShare}%</strong></label>}
  </section>

  <div className="production-input-strip">
   <span><SteelIcon size={16}/><i><small>STEEL / DAY</small><strong>{production.lastInputUse.steel.toFixed(2)}</strong></i></span>
   <span><FuelIcon size={16}/><i><small>FUEL / DAY</small><strong>{production.lastInputUse.fuel.toFixed(2)}</strong></i></span>
   <span><IndustryIcon size={16}/><i><small>POWER / DAY</small><strong>{production.lastInputUse.electricity.toFixed(2)}</strong></i></span>
   <span><i><small>TREASURY / DAY</small><strong>{'$'+production.lastInputUse.treasury.toFixed(3)+'B'}</strong></i></span>
  </div>

  <div className="subhead">STRATEGIC EQUIPMENT STOCKPILES</div>
  <div className="equipment-stock-grid">
   {EQUIPMENT_TYPES.map(type=>{const def=EQUIPMENT_CATALOG[type],line=production.lines[type],canDeploy=isPlayer&&production.stockpile[type]>=def.deployPack;return <article key={type} className="equipment-stock-card">
    <header><span><EquipmentGlyph type={type}/></span><div><small>{def.shortLabel}</small><strong>{def.label}</strong></div></header>
    <div className="equipment-stock-number">{fmt(production.stockpile[type])}</div>
    <div className="equipment-stock-flow"><span>+{fmt(production.lastDailyOutput[type])}/day</span><span>{line.factories} factories</span></div>
    {isPlayer&&<button disabled={!canDeploy} onClick={()=>state.deployEquipment(type)}>DEPLOY <small>{def.deployPack.toLocaleString()} units</small></button>}
   </article>;})}
  </div>

  <div className="subhead">PRODUCTION LINES</div>
  <div className="production-lines">
   {EQUIPMENT_TYPES.map(type=>{const def=EQUIPMENT_CATALOG[type],line=production.lines[type];return <article key={type} className="production-line-card">
    <div className="production-line-identity"><span><EquipmentGlyph type={type}/></span><div><strong>{def.label}</strong><small>{def.description}</small></div></div>
    <div className="production-line-eff"><span><small>EFFICIENCY</small><strong>{line.efficiency.toFixed(0)}%</strong></span><i><b style={{width:line.efficiency+'%'}}/></i></div>
    <div className="production-line-output"><small>OUTPUT</small><strong>{fmt(line.lastOutput)}/d</strong></div>
    <div className="production-line-factories">
     {isPlayer&&<button disabled={line.factories<=0} onClick={()=>state.setProductionFactories(type,line.factories-1)}>−</button>}
     <span><small>FACTORIES</small><strong>{line.factories}</strong></span>
     {isPlayer&&<button disabled={assigned>=capacity} onClick={()=>state.setProductionFactories(type,line.factories+1)}>+</button>}
    </div>
    <div className="production-line-inputs"><span>STEEL {(def.inputs.steel*line.factories).toFixed(2)}</span>{def.inputs.fuel>0&&<span>FUEL {(def.inputs.fuel*line.factories).toFixed(2)}</span>}<span>POWER {(def.inputs.electricity*line.factories).toFixed(2)}</span></div>
   </article>;})}
  </div>

  <p className="production-doctrine-note">Factories build reserves continuously. Low steel, fuel, electricity or treasury throttles output and erodes line efficiency. Healthy strategic reserves improve combat sustainment; deployed equipment reinforces the active military.</p>
 </div>;
}
