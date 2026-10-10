import type {GameState} from '../domain/game';
import type {GameCommand} from '../domain/commands';
import {integrationCost,integrationRequirements} from './systems/integration';
import {expansion} from './systems/sovereignCredit';
import {governance,occupationFor,CANDIDATES} from './systems/governance';
import {BASE_COST_B,scaledCostB} from './systems/policyPressure';

export interface AffairsPreview {allowed:boolean;cost:number;shortfall:number;cooldown:number;reasons:string[]}
/** Engine-owned readiness shared by command feedback and every Affairs review. */
export function affairsPreview(s:GameState,command:GameCommand):AffairsPreview|null {
 const p=s.countries[s.playerCountryId];
 const id='id' in command&&typeof command.id==='string'?command.id:'';
 const c=s.countries[id],e=expansion(s),g=governance(s),o=c?occupationFor(s,id):null;
 const reasons:string[]=[];let cost=0,cooldown=0;
 const controlled=()=>{if(!c||c.annexedBy||c.controllerCountryId!==p.id)reasons.push('You must control this territory first.');};
 const war=()=>Object.values(s.wars).some(w=>w.status==='active'&&[w.attackerId,w.defenderId].includes(id));
 switch(command.type){
  case 'integration/prepare':
   cost=.25;controlled();cooldown=Math.max(0,7-(s.day-(e.preparation[id]?.lastActionDay??-14)));
   if(e.integrations[id]?.status==='active')reasons.push('Integration is already in progress.');
   break;
  case 'integration/begin':
   controlled();cost=c?integrationCost(s,id):0;
   if(e.integrations[id]?.status==='active')reasons.push('Integration is already in progress.');
   if(e.integrations[id]?.status==='completed')reasons.push('This territory is already integrated.');
   if(c&&integrationRequirements(s,id).some(r=>r.value<r.min))reasons.push('Meet every integration requirement shown below.');
   break;
  case 'politics/campaign':
   cost=scaledCostB(p,BASE_COST_B.politicalCampaign);
   if(!c||id===p.id||c.controllerCountryId||c.annexedBy)reasons.push('Choose another independent country.');
   if(c){
    if(c.politics.approval>=40)reasons.push('Target approval must be below 40%.');
    if(c.politics.stability>=50)reasons.push('Target stability must be below 50%.');
    if((c.military.readiness+c.military.logistics)/2>=50&&c.society.influencePressure.ideology<30)reasons.push('Average readiness and logistics must be below 50%, or ideological pressure must reach 30%.');
   }
   for(const x of g.campaigns.filter(x=>x.targetId===id)){
    if(x.status==='active')reasons.push('A campaign is already in progress.');
    cooldown=Math.max(cooldown,x.endsDay+90-s.day);
   }
   break;
  case 'world/outreach':
   cost=scaledCostB(p,BASE_COST_B.worldOutreach);
   if(!c||id===p.id)reasons.push('Choose another country.');
   if((p.diplomacy.relations[id]?.score??0)<0)reasons.push('Relations must be at least 0.');
   for(const m of s.world.missions.filter(m=>m.targetId===id)){
    if(m.status==='active')reasons.push('An outreach mission is already in progress.');
    cooldown=Math.max(cooldown,m.endsDay+60-s.day);
   }
   break;
  case 'occupation/manage':
   controlled();
   if(command.action==='relief'||command.action==='suppress')cooldown=Math.max(0,7-(s.day-(o?.lastActionDay??0)));
   if(command.action==='relief'){cost=1;if(p.resources.food<20||p.resources.oil<5)reasons.push('Relief needs 20 food and 5 oil.');}
   if(command.action==='suppress'){cost=2;if(p.military.personnel<10000||p.military.readiness<30)reasons.push('Suppression needs 10,000 personnel and 30% readiness.');}
   if(command.action==='election'){cost=3;if(war())reasons.push('End active wars in this territory first.');if(o?.election)reasons.push('A transition election already exists.');}
   if(command.action==='transfer'){
    if(war())reasons.push('End active wars in this territory first.');
    const recipient=s.countries[command.value??''];if(!recipient||[p.id,id].includes(recipient.id)||recipient.controllerCountryId||recipient.annexedBy)reasons.push('Choose an independent recipient country.');
   }
   if(command.action==='support'){cost=1;if(!o?.election||o.election.resolved||!CANDIDATES.some(x=>x.id===command.value))reasons.push('Choose a candidate in an active election.');if(o?.election?.supported===command.value)reasons.push('This candidate already has your support.');}
   if(command.action==='accept')reasons.push('Use the elected government offer.');
   break;
  default:return null;
 }
 const shortfall=Math.max(0,cost-p.economy.treasury);
 if(shortfall>0)reasons.push('Your treasury cannot cover this cost.');
 if(cooldown>0)reasons.push('Wait for the cooldown shown below.');
 return {allowed:reasons.length===0,cost,shortfall,cooldown:Math.max(0,cooldown),reasons:[...new Set(reasons)]};
}
