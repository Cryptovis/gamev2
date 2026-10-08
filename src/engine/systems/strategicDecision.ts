import {activeCountries} from '../../domain/sovereignty';
import {calculateSupplyNetwork} from './supplyNetwork';
import type { GameState, TradeResource } from '../../domain/game';
import type { StrategicActionKind, StrategicDecisionSpec } from '../../domain/interaction';
import { blocForCountry } from './blocs';
import { GIFT_PACKAGE, embassyFor, embassyRelationBonus, relationFor, relationshipIndex } from './diplomacy';

export type StrategicDecisionContext={
  amountB?:1|5|10;
  resource?:TradeResource;
};

function rivalReactionCount(state:GameState,actorId:string,targetId:string){
  return activeCountries(state.countries).filter(observer=>{
    if(observer.id===actorId||observer.id===targetId)return false;
    const toTarget=relationFor(observer,targetId);
    const toActor=relationFor(observer,actorId);
    return (toTarget.status==='war'||toTarget.score<=-35)&&toActor.status!=='war';
  }).length;
}

export function strategicDecisionSpec(
  state:GameState,
  kind:StrategicActionKind,
  targetId:string,
  context:StrategicDecisionContext={},
):StrategicDecisionSpec|null{
  const actor=state.countries[state.playerCountryId];
  const target=state.countries[targetId];
  if(!actor||!target||actor.id===target.id)return null;
  const relation=relationFor(actor,target.id);
  const currentIndex=relationshipIndex(relation);
  const rivals=rivalReactionCount(state,actor.id,target.id);
  const base={kind,targetCountryId:target.id} as const;

  if(kind==='diplomatic_mission'){
    const gain=Math.round(10*embassyRelationBonus(state,actor.id,target.id));
    return {...base,kicker:'FOREIGN MINISTRY',title:'Authorize Diplomatic Mission',summary:'Dispatch a senior diplomatic mission to improve bilateral trust and reopen channels for deeper cooperation.',confirmLabel:'AUTHORIZE MISSION',tone:'positive',impacts:[
      {label:'Treasury',value:'-$2B',tone:'warning'},
      {label:'Relationship',value:'+'+gain+' raw',tone:'positive'},
      {label:'Current index',value:currentIndex+'/100'},
    ],warnings:['Goodwill gains are stronger when an embassy is already operating.']};
  }
  if(kind==='embassy'){
    return {...base,kicker:'DIPLOMATIC PRESENCE',title:'Open Embassy in '+target.name,summary:'Establish a permanent diplomatic mission. Embassies accelerate future goodwill and reduce bilateral trade friction.',confirmLabel:'OPEN EMBASSY',tone:'positive',impacts:[
      {label:'Establishment',value:'-$3B',tone:'warning'},
      {label:'Relationship',value:'+6 raw',tone:'positive'},
      {label:'Trade friction',value:'Reduced',tone:'positive'},
    ],warnings:['An embassy increases diplomatic access but may later become exposed to bilateral crises or intelligence incidents.']};
  }
  if(kind==='trade_pact'){
    return {...base,kicker:'TRADE NEGOTIATION',title:'Sign Trade Pact with '+target.name,summary:'Create a formal commercial framework that enables direct commodity imports and improves bilateral economic trust.',confirmLabel:'SIGN TRADE PACT',tone:'positive',impacts:[
      {label:'Mission cost',value:'-$5B',tone:'warning'},
      {label:'Relationship',value:'+4 raw',tone:'positive'},
      {label:'Rival exposure',value:rivals?String(rivals)+' states':'Low',tone:rivals?'warning':'neutral'},
    ],warnings:[
      'This sends a proposal. The partner replies in three days and can reject it. Costs are charged only on acceptance.',
      rivals?'Countries hostile to '+target.name+' may reduce their opinion of you.':'No major hostile-rival reaction is currently projected.',
    ]};
  }
  if(kind==='non_aggression'){
    return {...base,kicker:'SECURITY GUARANTEE',title:'Non-Aggression Pact with '+target.name,summary:'Commit both governments to mutual restraint and reduce the immediate risk of bilateral escalation.',confirmLabel:'SIGN NON-AGGRESSION',tone:'neutral',impacts:[
      {label:'Negotiation',value:'-$4B',tone:'warning'},
      {label:'Current index',value:currentIndex+'/100'},
      {label:'Strategic effect',value:'Mutual restraint',tone:'positive'},
    ],warnings:['This pact limits immediate hostility but does not create an alliance obligation.']};
  }
  if(kind==='alliance'){
    return {...base,kicker:'STRATEGIC ALIGNMENT',title:'Alliance with '+target.name,summary:'Enter a high-trust strategic alignment that changes how both countries are perceived by rivals and potential partners.',confirmLabel:'SIGN ALLIANCE',tone:'warning',impacts:[
      {label:'Summit cost',value:'-$10B',tone:'warning'},
      {label:'Relationship',value:'+8 raw',tone:'positive'},
      {label:'Status',value:'ALLY',tone:'positive'},
    ],warnings:['Alliance commitments can reshape third-party diplomacy and future bloc politics.','This is a high-impact strategic decision.']};
  }
  if(kind==='embargo'){
    const lifting=relation.sanctions;
    return {...base,kicker:'ECONOMIC STATECRAFT',title:(lifting?'Lift Embargo on ':'Impose Embargo on ')+target.name,summary:lifting?'Restore commercial access and reduce bilateral diplomatic pressure.':'Suspend bilateral commerce and apply direct diplomatic pressure.',confirmLabel:lifting?'LIFT EMBARGO':'IMPOSE EMBARGO',tone:lifting?'neutral':'danger',impacts:[
      {label:'Relationship',value:lifting?'+4 raw':'-12 raw',tone:lifting?'positive':'danger'},
      {label:'Active trade',value:lifting?'May resume':'Cancelled',tone:lifting?'neutral':'danger'},
      {label:'Current index',value:currentIndex+'/100'},
    ],warnings:[lifting?'Lifting sanctions does not automatically restore previous trade contracts.':'Existing bilateral trade flows will be cancelled immediately.']};
  }
  if(kind==='strategic_bloc'){
    const existing=blocForCountry(state,actor.id);
    return {...base,kicker:'MULTILATERAL STRATEGY',title:'Strategic Bloc Decision',summary:'Deepen institutional alignment with '+target.name+' through a formal strategic grouping.',confirmLabel:'PROCEED WITH BLOC',tone:'warning',impacts:[
      {label:'Treasury',value:existing?'$0B':'-$20B',tone:existing?'neutral':'warning'},
      {label:'Requirement',value:existing?'Alliance · REL 80/100':'Alliance · REL 83/100'},
      {label:'Partner',value:target.name},
      {label:'Relationship',value:currentIndex+'/100'},
      {label:'Global signal',value:'High',tone:'warning'},
    ],warnings:['Bloc alignment can alter the diplomatic calculations of rival states and neighboring powers.']};
  }
  if(kind==='treasury_aid'){
    const amount=context.amountB??1;
    return {...base,kicker:'GOODWILL / AID',title:'Treasury Grant to '+target.name,summary:'Provide direct financial support to generate immediate goodwill and reinforce bilateral ties.',confirmLabel:'SEND $'+amount+'B GRANT',tone:'positive',impacts:[
      {label:'Treasury',value:'-$'+amount+'B',tone:'warning'},
      {label:'Recipient',value:'+$'+amount+'B',tone:'positive'},
      {label:'Goodwill',value:amount===10?'High':amount===5?'Medium':'Limited',tone:'positive'},
    ],warnings:['Financial aid may be viewed unfavorably by states openly hostile to the recipient.']};
  }
  if(kind==='resource_aid'){
    const resource=context.resource??'food';
    const amount=Math.min(GIFT_PACKAGE[resource],actor.resources[resource]);
    return {...base,kicker:'GOODWILL / AID',title:'Send '+resource.toUpperCase()+' Aid to '+target.name,summary:'Transfer strategic reserves to support the recipient and improve bilateral goodwill.',confirmLabel:'SEND '+resource.toUpperCase()+' AID',tone:'positive',impacts:[
      {label:'Shipment',value:amount.toFixed(1)+' '+resource.toUpperCase(),tone:'warning'},
      {label:'Remaining reserve',value:(actor.resources[resource]-amount).toFixed(1),tone:'warning'},
      {label:'Goodwill',value:'Improves',tone:'positive'},
      {label:'Scarcity bonus',value:target.resources[resource]<(resource==='uranium'?3:60)?'ACTIVE':'Normal',tone:'positive'},
    ],warnings:['Aid is more diplomatically effective when the recipient is genuinely short of the resource.']};
  }
  if(kind==='declare_war'){
    const ballot=state.world.ballots.find(b=>b.kind==='attack'&&b.proposerId===actor.id&&b.targetId===target.id&&b.status!=='open');
    const rejected=ballot?.status==='rejected'&&!ballot.condemned;
    const pending=state.world.ballots.some(b=>b.kind==='attack'&&b.proposerId===actor.id&&b.targetId===target.id&&b.status==='open');
    return {...base,kicker:'NATIONAL SECURITY COUNCIL',title:'Declare War on '+target.name,summary:'Authorize open armed conflict. Trade is severed, bilateral relations collapse and national reputation is damaged.',confirmLabel:'DECLARE WAR',tone:'danger',impacts:[
      {label:'Relationship',value:'WAR / 0',tone:'danger'},
      {label:'Reputation',value:rejected?'-18 (includes condemnation)':'-8',tone:'danger'},
      {label:'International mandate',value:rejected?'REJECTED':pending?'VOTE STILL OPEN':ballot?.status==='passed'?'SUPPORTED':'Not requested',tone:rejected?'danger':'warning'},
      {label:'Trade',value:'Cancelled',tone:'danger'},
    ],warnings:[...(rejected?['The rejected resolution adds -10 reputation and -20 relations with opposing countries and target allies.']:pending?['The vote is still open. If it rejects your attack, condemnation will apply at closing.']:[]),'This action immediately creates an active war and cannot be undone with a simple cancel action.',...(calculateSupplyNetwork(actor).fuelDays<14?['Fuel reserves cover fewer than fourteen operational days. Secure refined fuel before starting this operation.']:[]),'Supply, fuel, infrastructure and equipment reserves will determine sustained combat effectiveness.']};
  }
  return null;
}

export function hasEmbassyAlready(state:GameState,targetId:string){
  return Boolean(embassyFor(state,state.playerCountryId,targetId));
}
