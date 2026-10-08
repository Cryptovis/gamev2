import { z } from 'zod';

const finite=z.number().finite(),day=finite.int().positive(),cell=finite.int().min(0).max(35);
const side=z.enum(['attacker','defender']);
const unit=z.object({id:z.string().min(1),side,role:z.enum(['infantry','armor','artillery']),cell,allocated:finite.int().nonnegative(),remaining:finite.int().nonnegative(),prepared:z.boolean().optional()}).refine(u=>u.remaining<=u.allocated);
const order=z.object({unitId:z.string(),kind:z.enum(['move','defend','flank','recon','reserve','bombard']),target:cell.optional()});
const losses=z.object({personnel:finite.int().nonnegative(),tanks:finite.int().nonnegative(),artillery:finite.int().nonnegative(),fighters:finite.int().nonnegative(),bombers:finite.int().nonnegative(),warships:finite.int().nonnegative()});
const units=z.array(unit).max(6).refine(us=>new Set(us.map(u=>u.id)).size===us.length&&new Set(us.filter(u=>u.remaining>0).map(u=>u.cell)).size===us.filter(u=>u.remaining>0).length&&new Set(us.map(u=>u.side+u.role)).size===us.length);
const event=z.object({round:finite.int().positive(),day,playerSide:side,orders:z.array(order).max(3),enemyOrders:z.array(order).max(3),attackerLosses:losses,defenderLosses:losses,attackerFuel:finite.nonnegative(),defenderFuel:finite.nonnegative(),progressBefore:finite.min(-100).max(100),progressAfter:finite.min(-100).max(100),units,beforeUnits:units,objective:side.nullable(),revealed:z.object({attacker:z.array(cell).max(36),defender:z.array(cell).max(36)})});
const tactical=z.object({version:z.literal(1),size:z.literal(6),startedDay:day,round:finite.int().nonnegative(),terrain:z.array(z.enum(['plains','urban','mountain','forest','desert','coastal'])).length(36),objectiveCell:cell,initialUnits:units,units,revealed:z.object({attacker:z.array(cell).max(36),defender:z.array(cell).max(36)}),events:z.array(event).max(60)});
const history=z.object({countryId:z.string(),points:z.array(z.object({day,gdp:finite.positive(),treasury:finite,inflation:finite,treasuryChange:finite})).min(1).max(180)});
export function valid083State(value:unknown):boolean {
  const s=value as {day:number;playerCountryId:string;countries:Record<string,unknown>;wars:Record<string,{id:string;attackerId:string;defenderId:string;rounds:number;lastCombatDay:number;tactical?:unknown;attackerStartPersonnel?:unknown;defenderStartPersonnel?:unknown}>;world:{economicHistory?:unknown}};
  if(s.world.economicHistory!==undefined){
    const h=history.safeParse(s.world.economicHistory);if(!h.success||h.data.countryId!==s.playerCountryId||h.data.points.some((p,i)=>p.day>s.day||(i>0&&p.day<=h.data.points[i-1].day)))return false;
  }
  for(const [id,w] of Object.entries(s.wars)){
    // 0.84 optional war-start strength; absent in older saves.
    if(w&&[w.attackerStartPersonnel,w.defenderStartPersonnel].some(n=>n!==undefined&&(typeof n!=='number'||!Number.isFinite(n)||n<0)))return false;
    if(!w||w.tactical===undefined)continue;
    const parsed=tactical.safeParse(w.tactical);if(!parsed.success)return false;
    const t=parsed.data;
    if(w.id!==id||!Number.isInteger(w.rounds)||!Number.isInteger(w.lastCombatDay)||!s.countries[w.attackerId]||!s.countries[w.defenderId]||w.attackerId===w.defenderId||t.startedDay>s.day||t.round>w.rounds)return false;
    if(t.events.some((e,i)=>e.day<t.startedDay||e.day>s.day||e.round>t.round||(i>0&&(e.round!==t.events[i-1].round+1||e.day<=t.events[i-1].day))))return false;
    const last=t.events.at(-1);
    if(t.round===0?t.events.length!==0:!last||last.round!==t.round||last.day!==w.lastCombatDay||JSON.stringify(last.units)!==JSON.stringify(t.units))return false;
    if(t.units.some(u=>u.id!==`${u.side}-${u.role}`))return false;
    const allocated=new Map(t.initialUnits.map(u=>[u.id,u.allocated]));
    if(t.units.length!==t.initialUnits.length||t.units.some(u=>allocated.get(u.id)!==u.allocated))return false;
    if(t.events.some(e=>[...e.units,...e.beforeUnits].some(u=>allocated.get(u.id)!==u.allocated)))return false;
    if(t.events.some(e=>e.units.some(u=>{const before=e.beforeUnits.find(x=>x.id===u.id);const key=u.role==='infantry'?'personnel':u.role==='armor'?'tanks':'artillery';return !before||u.remaining>Math.max(0,before.remaining-(u.side==='attacker'?e.attackerLosses:e.defenderLosses)[key]);})))return false;
  }
  return true;
}
