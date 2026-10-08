import type { CasualtySnapshot, GameState, WarState } from '../../domain/game';
import type { TacticalBattle, TacticalOrder, TacticalOrderKind, TacticalSide, TacticalUnit } from '../../domain/tactical';
import { emptyLosses, resolveCombatRound, type CombatSideOrders } from './warfare';
import { pendingVictory } from './victory';

export const COMMAND_BUDGET = 3;
export const ORDER_COST:Record<TacticalOrderKind,number> = { move:1, defend:1, flank:2, recon:1, reserve:1, bombard:2 };
export const ORDER_FUEL:Record<TacticalOrderKind,number> = { move:1, defend:0, flank:2, recon:1, reserve:0, bombard:2 };
const clamp = (n:number,a:number,b:number) => Math.min(b,Math.max(a,n));
const other = (side:TacticalSide):TacticalSide => side==='attacker'?'defender':'attacker';
export const cellDistance = (a:number,b:number) => Math.abs(a%6-b%6)+Math.abs(Math.floor(a/6)-Math.floor(b/6));
export const playerSide = (s:GameState,w:WarState):TacticalSide => w.attackerId===s.playerCountryId?'attacker':'defender';
const countryId = (w:WarState,side:TacticalSide) => side==='attacker'?w.attackerId:w.defenderId;
const roleKey = (u:TacticalUnit):'personnel'|'tanks'|'artillery' => u.role==='infantry'?'personnel':u.role==='armor'?'tanks':'artillery';
export function visibleCells(b:TacticalBattle,side:TacticalSide,round=b.round):Set<number> {
  const visible = new Set<number>();
  for(let cell=0;cell<36;cell++)if(b.units.some(u=>u.side===side&&u.remaining>0&&cellDistance(u.cell,cell)<=2))visible.add(cell);
  // Recon persists for the next planning round, then expires.
  if(round===b.round)for(const cell of b.revealed[side])visible.add(cell);
  return visible;
}
export function tacticalStartStatus(s:GameState,id:string):string|null {
  const w=s.wars[id];
  if(!w||w.status!=='active')return 'This war is no longer active.';
  if(![w.attackerId,w.defenderId].includes(s.playerCountryId))return 'Only participants can command this battle.';
  if(w.tactical)return 'The tactical battlefield is already active.';
  if(Object.values(s.wars).some(x=>x.status==='active'&&x.tactical&&[x.attackerId,x.defenderId].some(id=>[w.attackerId,w.defenderId].includes(id))))return 'These forces are already committed to another tactical battle.';
  return null;
}
export function startTacticalBattle(s:GameState,id:string):GameState {
  if(tacticalStartStatus(s,id))return s;
  const w=s.wars[id],units:TacticalUnit[]=[];
  for(const side of ['attacker','defender'] as const){
    const m=s.countries[countryId(w,side)].military;
    for(const [i,role] of (['infantry','armor','artillery'] as const).entries()){
      const allocated=Math.floor((role==='infantry'?m.personnel:role==='armor'?m.tanks:m.artillery)*.25);
      if(allocated>0)units.push({id:`${side}-${role}`,side,role,cell:(i+1)*6+(side==='attacker'?1:4),allocated,remaining:allocated});
    }
  }
  const tactical:TacticalBattle={version:1,size:6,startedDay:s.day,round:0,terrain:Array.from({length:36},(_,i)=>i%7===0?w.terrain:'plains'),objectiveCell:15,initialUnits:structuredClone(units),units,revealed:{attacker:[],defender:[]},events:[]};
  return {...s,speed:0,wars:{...s.wars,[id]:{...w,autoAssault:false,tactical}},sitrep:['WAR // Tactical battlefield opened. Orders resolve once per campaign day.',...s.sitrep].slice(0,12)};
}
export function tacticalFuel(s:GameState,w:WarState,side:TacticalSide,orders:TacticalOrder[]):number {
  const m=s.countries[countryId(w,side)].military;
  const offensive=orders.some(o=>['move','flank','bombard'].includes(o.kind));
  return (offensive?Math.max(3,2.5+m.tanks*.0016+m.fighters*.02+m.bombers*.032)*.25:0)+orders.reduce((n,o)=>n+(ORDER_FUEL[o.kind]??0),0);
}
export function validateTacticalOrders(s:GameState,id:string,side:TacticalSide,orders:TacticalOrder[]):string[] {
  const w=s.wars[id],b=w?.tactical,reasons:string[]=[];
  if(!w||!b||w.status!=='active')return ['This war is no longer active.'];
  if(!Array.isArray(orders)||orders.length>3)return ['Use at most three orders per round.'];
  if(orders.some(o=>!o||typeof o!=='object'||!Object.hasOwn(ORDER_COST,o.kind)))return ['Choose a valid tactical order.'];
  if(orders.reduce((n,o)=>n+(ORDER_COST[o.kind]??99),0)>COMMAND_BUDGET)reasons.push('The command budget is three points per round.');
  const ids=new Set<string>(),destinations=new Set<number>(),visible=visibleCells(b,side);
  for(const order of orders){
    const u=b.units.find(x=>x.id===order.unitId&&x.side===side&&x.remaining>0);
    if(!u){reasons.push('Choose a surviving unit under your command.');continue;}
    if(ids.has(u.id))reasons.push('Each unit can receive only one order per round.');ids.add(u.id);
    if(!Object.hasOwn(ORDER_COST,order.kind)){reasons.push('Choose a valid tactical order.');continue;}
    const targeted=['move','flank','recon','bombard'].includes(order.kind);
    if(!targeted){if(order.target!==undefined)reasons.push('This order does not need a target.');continue;}
    const target=order.target;
    if(target===undefined||!Number.isInteger(target)||target<0||target>=36){reasons.push('Choose a sector on the battlefield.');continue;}
    const distance=cellDistance(u.cell,target);
    if(order.kind==='recon'){if(distance>3)reasons.push('Recon targets must be within three sectors.');continue;}
    if(!visible.has(target)){reasons.push('Recon is required before ordering into an unseen sector.');continue;}
    if(order.kind==='bombard'){
      if(u.role!=='artillery'||distance>3||!b.units.some(x=>x.side!==side&&x.remaining>0&&x.cell===target))reasons.push('Artillery can bombard a visible enemy within three sectors.');
      continue;
    }
    const range=order.kind==='flank'||u.role==='armor'?2:1;
    if(distance<1||distance>range)reasons.push('The selected sector is outside this unit’s movement range.');
    if(order.kind==='flank'&&(side==='attacker'?target%6<=u.cell%6:target%6>=u.cell%6))reasons.push('Flanking must advance toward the opposing front.');
    if(distance===2&&!Array.from({length:36},(_,i)=>i).some(c=>cellDistance(c,u.cell)===1&&cellDistance(c,target)===1&&!b.units.some(x=>x.remaining>0&&x.cell===c)&&(u.role!=='armor'||b.terrain[c]!=='mountain')))reasons.push('The movement path is blocked. Choose another route.');
    if(b.units.some(x=>x.remaining>0&&x.cell===target)||destinations.has(target))reasons.push('Choose an unoccupied destination sector.');
    destinations.add(target);
    if(distance===2&&b.terrain[target]==='mountain'&&u.role==='armor')reasons.push('Armor cannot cross two sectors into mountain terrain.');
  }
  if(tacticalFuel(s,w,side,orders)>s.countries[countryId(w,side)].processedResources.fuel)reasons.push('Not enough fuel for these orders. Defend, hold reserves or secure fuel imports.');
  return [...new Set(reasons)];
}
export function chooseTacticalOrders(s:GameState,id:string,side:TacticalSide):TacticalOrder[] {
  const b=s.wars[id].tactical!,orders:TacticalOrder[]=[];
  const enemies=b.units.filter(u=>u.side!==side&&u.remaining>0&&visibleCells(b,side).has(u.cell));
  for(const u of b.units.filter(u=>u.side===side&&u.remaining>0)){
    const candidates:TacticalOrder[]=[];
    if(u.role==='artillery')for(const enemy of enemies)candidates.push({unitId:u.id,kind:'bombard',target:enemy.cell});
    if(u.cell!==b.objectiveCell){
      const cells=Array.from({length:36},(_,i)=>i).filter(c=>cellDistance(u.cell,c)<=2&&cellDistance(c,b.objectiveCell)<cellDistance(u.cell,b.objectiveCell)).sort((a,c)=>cellDistance(a,b.objectiveCell)-cellDistance(c,b.objectiveCell)||a-c);
      for(const target of cells)candidates.push({unitId:u.id,kind:u.role==='armor'?'flank':'move',target});
    }
    candidates.push({unitId:u.id,kind:'defend'});
    const chosen=candidates.find(o=>validateTacticalOrders(s,id,side,[...orders,o]).length===0);
    if(chosen)orders.push(chosen);
  }
  return orders;
}
function sideModifiers(s:GameState,w:WarState,side:TacticalSide,orders:TacticalOrder[],enemyOrders:TacticalOrder[]):CombatSideOrders {
  const b=w.tactical!,m=s.countries[countryId(w,side)].military,forces=emptyLosses();
  for(const u of b.units.filter(u=>u.side===side))forces[roleKey(u)]=Math.min(m[roleKey(u)],u.remaining);
  for(const key of ['fighters','bombers','warships'] as const)forces[key]=Math.floor(m[key]*.25);
  const count=(kind:TacticalOrderKind)=>orders.filter(o=>o.kind===kind).length;
  const bombarded=enemyOrders.filter(o=>o.kind==='bombard').length;
  const lossByType:Partial<Record<keyof CasualtySnapshot,number>>={};
  for(const order of enemyOrders.filter(o=>o.kind==='bombard')){const target=b.units.find(u=>u.side===side&&u.cell===order.target);if(target)lossByType[roleKey(target)]=.12;}
  const covered=orders.filter(o=>o.kind==='defend').filter(o=>b.terrain[b.units.find(u=>u.id===o.unitId)!.cell]!=='plains').length;
  const prepared=orders.filter(o=>['move','flank','bombard'].includes(o.kind)&&b.units.find(u=>u.id===o.unitId)?.prepared).length;
  const objective=b.units.some(u=>u.side===side&&u.remaining>0&&u.cell===b.objectiveCell);
  const surviving=b.units.filter(u=>u.side===side).reduce((n,u)=>n+u.remaining/Math.max(1,u.allocated),0)/Math.max(1,b.units.filter(u=>u.side===side).length);
  return {power:(.05+surviving*.95)*clamp(.85+surviving*.1+prepared*.04+count('flank')*.08+count('bombard')*.06+count('recon')*.02+covered*.025+(objective?.1:0)-count('reserve')*.025-bombarded*.04,.75,1.25),loss:clamp(1-count('defend')*.06-count('reserve')*.07+count('flank')*.08+bombarded*.06,.75,1.25),lossByType,fuel:orders.some(o=>['move','flank','bombard'].includes(o.kind))?.25:0,forces};
}
export function tacticalCommandStatus(s:GameState,id:string,expectedRound:number,orders:TacticalOrder[]):string[] {
  const w=s.wars[id];
  if(!w?.tactical)return ['Open the tactical battlefield first.'];
  if(![w.attackerId,w.defenderId].includes(s.playerCountryId))return ['Only participants can command this battle.'];
  if(s.campaignStatus!=='active'||s.activeEvent||s.activeAdvisor||s.world.living?.advice.active||s.world.living?.notice||pendingVictory(s))return ['Resolve the pending campaign decision before giving combat orders.'];
  if(w.tactical.round!==expectedRound)return ['These orders belong to an earlier round. Review the current battlefield.'];
  if(w.lastCombatDay===s.day)return ['Orders already executed today. Advance one campaign day for the next round.'];
  return validateTacticalOrders(s,id,playerSide(s,w),orders);
}
export function resolveTacticalRound(s:GameState,id:string,orders:TacticalOrder[],expectedRound:number):GameState {
  if(tacticalCommandStatus(s,id,expectedRound,orders).length)return s;
  const w=s.wars[id],b=w.tactical!,mine=playerSide(s,w),enemy=other(mine),enemyOrders=chooseTacticalOrders(s,id,enemy);
  const bySide:Record<TacticalSide,TacticalOrder[]>={attacker:mine==='attacker'?orders:enemyOrders,defender:mine==='defender'?orders:enemyOrders};
  const costs={attacker:tacticalFuel(s,w,'attacker',bySide.attacker),defender:tacticalFuel(s,w,'defender',bySide.defender)};
  // Moves are simultaneous. Conflicting destinations leave both units in place.
  const all=[...orders,...enemyOrders];
  const units=b.units.map(u=>{
    const o=all.find(x=>x.unitId===u.id);
    const moves=o&&['move','flank'].includes(o.kind)&&all.filter(x=>['move','flank'].includes(x.kind)&&x.target===o.target).length===1;
    return {...u,cell:moves?o.target!:u.cell,remaining:Math.min(u.remaining,s.countries[countryId(w,u.side)].military[roleKey(u)])};
  });
  const stagedWar={...w,tactical:{...b,units}};
  const modifiers={attacking:bySide.attacker.some(o=>['move','flank','bombard'].includes(o.kind)),attacker:sideModifiers(s,stagedWar,'attacker',bySide.attacker,bySide.defender),defender:sideModifiers(s,stagedWar,'defender',bySide.defender,bySide.attacker)};
  const staged={...s,wars:{...s.wars,[id]:stagedWar}};
  let next=resolveCombatRound(staged,id,modifiers);
  if(next.wars[id].rounds===w.rounds)return s;
  const nw=next.wars[id];
  const difference=(side:TacticalSide):CasualtySnapshot=>Object.fromEntries(Object.entries(side==='attacker'?nw.attackerLosses:nw.defenderLosses).map(([key,n])=>[key,n-(side==='attacker'?w.attackerLosses:w.defenderLosses)[key as keyof CasualtySnapshot]])) as unknown as CasualtySnapshot;
  const losses={attacker:difference('attacker'),defender:difference('defender')};
  const after=units.map(u=>({...u,prepared:bySide[u.side].some(o=>o.unitId===u.id&&o.kind==='reserve'),remaining:Math.max(0,u.remaining-losses[u.side][roleKey(u)])}));
  const revealed:Record<TacticalSide,number[]>={attacker:[],defender:[]};
  for(const side of ['attacker','defender'] as const){
    for(const order of bySide[side].filter(o=>o.kind==='recon'))for(let cell=0;cell<36;cell++)if(cellDistance(cell,order.target!)<=2)revealed[side].push(cell);
    const c=next.countries[countryId(w,side)];
    // The shared resolver already charged the attacker's base operational fuel.
    const extra=side==='attacker'?bySide.attacker.reduce((n,o)=>n+ORDER_FUEL[o.kind],0):costs.defender;
    next={...next,countries:{...next.countries,[c.id]:{...c,processedResources:{...c.processedResources,fuel:Math.max(0,c.processedResources.fuel-extra)}}}};
  }
  revealed.attacker=[...new Set(revealed.attacker)];revealed.defender=[...new Set(revealed.defender)];
  const objective=after.find(u=>u.remaining>0&&u.cell===b.objectiveCell)?.side??null;
  const event={round:b.round+1,day:s.day,playerSide:mine,orders:structuredClone(orders),enemyOrders,attackerLosses:losses.attacker,defenderLosses:losses.defender,attackerFuel:costs.attacker,defenderFuel:costs.defender,progressBefore:w.progress,progressAfter:nw.progress,units:after,beforeUnits:structuredClone(b.units),objective,revealed};
  return {...next,wars:{...next.wars,[id]:{...nw,tactical:{...b,round:b.round+1,units:after,revealed,events:[...b.events,event].slice(-60)}}}};
}
export function processAutoTacticalWars(s:GameState):GameState {
  let next=s;
  for(const w of Object.values(s.wars))if(w.status==='active'&&w.tactical&&w.autoAssault&&[w.attackerId,w.defenderId].includes(s.playerCountryId))next=resolveTacticalRound(next,w.id,chooseTacticalOrders(next,w.id,playerSide(next,w)),next.wars[w.id].tactical!.round);
  return next;
}
