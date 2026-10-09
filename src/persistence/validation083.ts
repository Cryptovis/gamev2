import { z } from 'zod';
import { MAX_BATTLE_CELLS } from '../engine/systems/tactical';

const finite=z.number().finite(),day=finite.int().positive(),cell=finite.int().min(0).max(MAX_BATTLE_CELLS-1);
const side=z.enum(['attacker','defender']);
const unit=z.object({id:z.string().min(1),side,role:z.enum(['infantry','armor','artillery']),cell,allocated:finite.int().nonnegative(),remaining:finite.int().nonnegative(),prepared:z.boolean().optional()}).refine(u=>u.remaining<=u.allocated);
const order=z.object({unitId:z.string(),kind:z.enum(['move','defend','flank','recon','reserve','bombard']),target:cell.optional()});
const losses=z.object({personnel:finite.int().nonnegative(),tanks:finite.int().nonnegative(),artillery:finite.int().nonnegative(),fighters:finite.int().nonnegative(),bombers:finite.int().nonnegative(),warships:finite.int().nonnegative()});
const units=z.array(unit).max(10).refine(us=>new Set(us.map(u=>u.id)).size===us.length&&new Set(us.filter(u=>u.remaining>0).map(u=>u.cell)).size===us.filter(u=>u.remaining>0).length);
const revealed=z.object({attacker:z.array(cell).max(MAX_BATTLE_CELLS),defender:z.array(cell).max(MAX_BATTLE_CELLS)});
// 0.85 HD War v2 action timeline (schema 17).
const action=z.object({kind:z.enum(['move','blocked','defend','reserve','recon','bombard','casualties','lost','capture','contest']),side,unitId:z.string().optional(),from:cell.optional(),to:cell.optional(),target:cell.optional(),hit:z.boolean().optional(),amount:finite.int().nonnegative().optional(),objective:cell.optional()});
const event=z.object({round:finite.int().positive(),day,playerSide:side,orders:z.array(order).max(3),enemyOrders:z.array(order).max(3),attackerLosses:losses,defenderLosses:losses,attackerFuel:finite.nonnegative(),defenderFuel:finite.nonnegative(),progressBefore:finite.min(-100).max(100),progressAfter:finite.min(-100).max(100),units,beforeUnits:units,objectives:z.array(side.nullable()).min(1).max(4),revealed,actions:z.array(action).max(64)});
const tactical=z.object({version:z.literal(2),width:finite.int().min(6).max(12),height:finite.int().min(6).max(8),seed:finite.int().nonnegative(),rngState:finite.int().nonnegative().optional(),startedDay:day,round:finite.int().nonnegative(),terrain:z.array(z.enum(['plains','urban','mountain','forest','desert','coastal'])).max(MAX_BATTLE_CELLS),objectives:z.array(cell).min(1).max(4),initialUnits:units,units,revealed,events:z.array(event).max(60)});
const UNIT_ID=/^(attacker|defender)-(infantry|armor|artillery)(-[1-9])?$/;
const roleKey=(role:string)=>role==='infantry'?'personnel':role==='armor'?'tanks':'artillery';
type Battle=z.infer<typeof tactical>;type Unit=Battle['units'][number];
/** Every cell reference fits the battle's own grid; objectives are distinct. */
function withinGrid(t:Battle):boolean {
  const n=t.width*t.height,inside=(c:number|undefined)=>c===undefined||c<n,unitsInside=(us:Unit[])=>us.every(u=>inside(u.cell));
  if(t.terrain.length!==n||new Set(t.objectives).size!==t.objectives.length||!t.objectives.every(inside))return false;
  if(!unitsInside(t.units)||!unitsInside(t.initialUnits)||![...t.revealed.attacker,...t.revealed.defender].every(inside))return false;
  return t.events.every(e=>unitsInside(e.units)&&unitsInside(e.beforeUnits)&&e.objectives.length===t.objectives.length&&[...e.orders,...e.enemyOrders].every(o=>inside(o.target))&&[...e.revealed.attacker,...e.revealed.defender].every(inside)&&e.actions.every(a=>[a.from,a.to,a.target,a.objective].every(inside)));
}
/** A round can only remove forces: per group, survivors never exceed what was there minus the campaign losses. */
function lossesReconcile(e:Battle['events'][number],allocated:Map<string,number>):boolean {
  if([...e.units,...e.beforeUnits].some(u=>allocated.get(u.id)!==u.allocated))return false;
  for(const u of e.units){const before=e.beforeUnits.find(x=>x.id===u.id);if(!before||u.remaining>before.remaining)return false;}
  for(const s of ['attacker','defender'] as const)for(const role of ['infantry','armor','artillery'] as const){
    const sum=(us:Unit[])=>us.filter(u=>u.side===s&&u.role===role).reduce((n,u)=>n+u.remaining,0);
    if(sum(e.units)>Math.max(0,sum(e.beforeUnits)-(s==='attacker'?e.attackerLosses:e.defenderLosses)[roleKey(role)]))return false;
  }
  return true;
}
// 0.87 repeat fatigue (policyPressure.ts) and per-programme effect strength; all optional, absent in older saves.
// Plain checks (no zod) so the rule is exercised even where zod is stubbed.
const isFiniteNumber=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const validStrength=(item:unknown)=>{
  if(!item||typeof item!=='object')return false;
  const strength=(item as {strength?:unknown}).strength;
  return strength===undefined||(isFiniteNumber(strength)&&strength>=0&&strength<=1);
};
const validStrengths=(list:unknown)=>list===undefined||(Array.isArray(list)&&list.every(validStrength));
export function validPressureState(s:{day:number;world:{actionFatigue?:unknown;programs?:unknown;living?:{activities?:unknown}}}):boolean {
  const f=s.world.actionFatigue;
  if(f!==undefined){
    if(!f||typeof f!=='object'||Array.isArray(f))return false;
    for(const [key,r] of Object.entries(f as Record<string,unknown>)){
      const rec=r as {value?:unknown;day?:unknown}|null;
      if(!/^[^|]+\|.+$/.test(key)||!rec||typeof rec!=='object'||!isFiniteNumber(rec.value)||rec.value<0||!isFiniteNumber(rec.day)||!Number.isInteger(rec.day)||rec.day<0||rec.day>s.day)return false;
    }
  }
  return validStrengths(s.world.programs)&&validStrengths(s.world.living?.activities);
}
const history=z.object({countryId:z.string(),points:z.array(z.object({day,gdp:finite.positive(),treasury:finite,inflation:finite,treasuryChange:finite})).min(1).max(180)});
export function valid083State(value:unknown):boolean {
  const s=value as {day:number;playerCountryId:string;countries:Record<string,unknown>;wars:Record<string,{id:string;attackerId:string;defenderId:string;rounds:number;lastCombatDay:number;tactical?:unknown;attackerStartPersonnel?:unknown;defenderStartPersonnel?:unknown}>;world:{economicHistory?:unknown;actionFatigue?:unknown;programs?:unknown;living?:{activities?:unknown}}};
  if(!validPressureState(s))return false;
  if(s.world.economicHistory!==undefined){
    const h=history.safeParse(s.world.economicHistory);if(!h.success||h.data.countryId!==s.playerCountryId||h.data.points.some((p,i)=>p.day>s.day||(i>0&&p.day<=h.data.points[i-1].day)))return false;
  }
  for(const [id,w] of Object.entries(s.wars)){
    // 0.84 optional war-start strength; absent in older saves.
    if(w&&[w.attackerStartPersonnel,w.defenderStartPersonnel].some(n=>n!==undefined&&(typeof n!=='number'||!Number.isFinite(n)||n<0)))return false;
    // 0.88 optional co-belligerents: distinct known countries, never a main party; absent in older saves.
    const allies=(w as {defenderAllies?:unknown})?.defenderAllies;
    if(w&&allies!==undefined&&(!Array.isArray(allies)||allies.some(a=>typeof a!=='string'||!s.countries[a]||a===w.attackerId||a===w.defenderId)||new Set(allies).size!==allies.length))return false;
    if(!w||w.tactical===undefined)continue;
    const parsed=tactical.safeParse(w.tactical);if(!parsed.success)return false;
    const t=parsed.data;
    if(w.id!==id||!Number.isInteger(w.rounds)||!Number.isInteger(w.lastCombatDay)||!s.countries[w.attackerId]||!s.countries[w.defenderId]||w.attackerId===w.defenderId||t.startedDay>s.day||t.round>w.rounds)return false;
    if(t.events.some((e,i)=>e.day<t.startedDay||e.day>s.day||e.round>t.round||(i>0&&(e.round!==t.events[i-1].round+1||e.day<=t.events[i-1].day))))return false;
    const last=t.events.at(-1);
    if(t.round===0?t.events.length!==0:!last||last.round!==t.round||last.day!==w.lastCombatDay||JSON.stringify(last.units)!==JSON.stringify(t.units))return false;
    if(!withinGrid(t)||t.units.some(u=>!UNIT_ID.test(u.id)||!u.id.startsWith(`${u.side}-${u.role}`)))return false;
    const allocated=new Map(t.initialUnits.map(u=>[u.id,u.allocated]));
    if(t.units.length!==t.initialUnits.length||t.units.some(u=>allocated.get(u.id)!==u.allocated))return false;
    if(t.events.some(e=>!lossesReconcile(e,allocated)))return false;
  }
  return true;
}
