import {diplomaticProposalStatus,letterCost} from '../../engine/systems/livingEconomy';
import {BASE_COST_B,diplomaticMissionStatus,formatCostB,scaledCostB} from '../../engine/systems/policyPressure';
import {CivicArt} from '../icons/CivicArt';
import {AssetThumbnail} from '../icons/AssetThumbnail';
import {LocaleText,translateLive} from '../../i18n/localeText';
import { useState } from 'react';
import { blocForCountry } from '../../engine/systems/blocs';
import { embassyFor, relationFor, relationshipIndex, relationshipStance } from '../../engine/systems/diplomacy';
import type { TradeResource } from '../../domain/game';
import { shouldConfirmAction, type StrategicActionKind, type StrategicDecisionSpec } from '../../domain/interaction';
import { strategicDecisionSpec, type StrategicDecisionContext } from '../../engine/systems/strategicDecision';
import { StrategicDecisionModal } from './StrategicDecisionModal';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { BlocIcon, DiplomacyIcon, EmbassyIcon, ResourceIcon, WarIcon } from '../icons/GameIcons';

const resources:TradeResource[]=['food','oil','iron','uranium'];
const humanize=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase());

export function DiplomacyPanel({selectedId}:{selectedId:string}){
 const state=useGameStore();
 const [pendingDecision,setPendingDecision]=useState<{spec:StrategicDecisionSpec;execute:()=>void}|null>(null);
 const player=state.countries[state.playerCountryId];
 const selected=state.countries[selectedId];
 if(!player||!selected)return null;
 const isPlayer=selected.id===player.id;
 if(isPlayer)return <div className="diplomacy-home-empty"><small><LocaleText value={"BILATERAL RELATIONS"}/></small><strong><LocaleText value={"Select another sovereign state"}/></strong><p><LocaleText value={"Choose a country on the map to negotiate trade, aid, treaties and strategic cooperation."}/></p></div>;

 const relation=relationFor(player,selected.id);
 const relationScore=relationshipIndex(relation);
 const relationLabel=relationshipStance(relation);
 const playerBloc=blocForCountry(state,player.id);
 const embassy=embassyFor(state,player.id,selected.id);
 const embassyStatus=diplomaticProposalStatus(state,selected.id,'embassy'),tradeStatus=diplomaticProposalStatus(state,selected.id,'trade_pact');
 const tradeDeals=Object.values(state.tradeDeals).filter(d=>d.active&&((d.sellerId===selected.id&&d.buyerId===player.id)||(d.buyerId===selected.id&&d.sellerId===player.id)));
 const hasTrade=relation.treaties.includes('trade');
 const hasNonAggression=relation.treaties.includes('nonAggression');
 const hasAlliance=relation.treaties.includes('alliance');
 const blocMember=Boolean(playerBloc?.memberIds.includes(selected.id));
 // GDP-scaled costs and the mission cooldown come from the engine rules (audit C15).
 const mission=diplomaticMissionStatus(state,player.id,selected.id),cost=(base:number)=>formatCostB(scaledCostB(player,base));
 const blocCost=scaledCostB(player,BASE_COST_B.strategicBloc);
 const blocRequirement=playerBloc?'requires alliance · REL 80/100':`requires alliance · REL 83/100 · ${formatCostB(blocCost)}`;
 const canAlign=!blocMember&&hasAlliance&&relation.status!=='war'&&relation.score>=(playerBloc?60:65)&&(Boolean(playerBloc)||player.economy.treasury>=blocCost);
 const requestDecision=(kind:StrategicActionKind,execute:()=>void,context:StrategicDecisionContext={})=>{
  if((kind==='embassy'&&!embassyStatus.allowed)||(kind==='trade_pact'&&!tradeStatus.allowed)){state.navigate('diplomacy-inbox',selected.id);return;}
  if(!shouldConfirmAction(kind,state.confirmationSkips)){execute();return;}
  const spec=strategicDecisionSpec(state,kind,selected.id,context);
  if(!spec)return;
  setPendingDecision({spec,execute});
 };

 return <div className="diplomacy-v2">
  <div className={`relation-hero stance-${relationLabel.toLowerCase().replaceAll(' ','-')}`}>
   <div className="relation-flags"><span><LocaleText value={flagEmoji(player.iso2)}/></span><i><LocaleText value={"↔"}/></i><span><LocaleText value={flagEmoji(selected.iso2)}/></span></div>
   <div className="relation-copy"><small><LocaleText value={"BILATERAL RELATIONSHIP INDEX"}/></small><strong><LocaleText value={relationScore}/><em><LocaleText value={"/100"}/></em></strong><span><LocaleText value={relationLabel}/></span></div>
   <div className="relation-meter"><i><b style={{width:`${relationScore}%`}}/></i><div><span><LocaleText value={"HOSTILE"}/></span><span><LocaleText value={"NEUTRAL"}/></span><span><LocaleText value={"PARTNER"}/></span></div></div>
  </div>

  <div className="relation-context">
   <span><small><LocaleText value={"CURRENT STATUS"}/></small><strong><LocaleText value={relation.status==='war'?'WAR':relationLabel}/></strong></span>
   <span><small><LocaleText value={"ACTIVE TREATIES"}/></small><strong><LocaleText value={relation.treaties.length?relation.treaties.map(humanize).join(' · '):'None'}/></strong></span>
   <span><small><LocaleText value={"EMBASSY"}/></small><strong><LocaleText value={embassy?`LEVEL ${embassy.level}`:'NONE'}/></strong></span>
  </div>

  <aside className="proposal-assessment"><p><LocaleText value="Above 50/100 is Good and makes trade acceptance easier. Trade proposals need at least 20/100. Missions or aid raise relations; acceptance is not guaranteed."/></p><strong><LocaleText value="Points to trade eligibility"/>: {Math.max(0,20-relationScore)} · <LocaleText value="Points to Good"/>: {Math.max(0,51-relationScore)}</strong>{relation.tradeStrainSinceDay!==undefined&&<p><LocaleText value="Trade pact at risk. Restore relations to at least 20/100 before the grace period ends."/> · <LocaleText value="Days remaining"/>: {Math.max(0,14-(state.day-relation.tradeStrainSinceDay))}</p>}</aside>
  {(!embassyStatus.allowed||!tradeStatus.allowed)&&<aside className="proposal-status">{!embassyStatus.allowed&&<p><strong><LocaleText value="Embassy exchange"/>: </strong><LocaleText value={embassyStatus.reason}/></p>}{!tradeStatus.allowed&&<p><strong><LocaleText value="Trade framework"/>: </strong><LocaleText value={tradeStatus.reason}/></p>}<button onClick={()=>state.navigate('diplomacy-inbox',selected.id)}><LocaleText value="Help / track proposals"/></button></aside>}
  <div className="subhead"><LocaleText value={"DIPLOMATIC ACTIONS"}/></div>
  <div className="action-grid diplomacy-actions">
   <button data-action="mission" disabled={!mission.allowed} onClick={()=>requestDecision('diplomatic_mission',()=>state.improveRelations(selected.id))}><CivicArt kind="letter" size={34}/><span><LocaleText value={"Diplomatic Mission "}/><small><LocaleText value={mission.cooldownDays>0?`next mission in ${mission.cooldownDays} days`:`-${formatCostB(mission.costB)} · gradual goodwill`}/></small></span></button>
   <button data-action="embassy"  onClick={()=>requestDecision('embassy',()=>state.openEmbassyWith(selected.id))}><AssetThumbnail asset="embassy" size={34}/><span><LocaleText value={!embassyStatus.allowed?'Track proposal / status':'Open Embassy'}/> <small><LocaleText value={embassy?'relations & trade boosted':`${formatCostB(letterCost(state,player.id,'embassy'))} if accepted · reply in 3 days`}/></small></span></button>
   <button data-action="trade"  onClick={()=>requestDecision('trade_pact',()=>state.signTradePact(selected.id))}><CivicArt kind="letter" size={34}/><span><LocaleText value={!tradeStatus.allowed?'Track proposal / status':'Trade Pact'}/> <small><LocaleText value={hasTrade?'commercial framework active':`${formatCostB(letterCost(state,player.id,'trade_pact'))} if accepted · reply in 3 days`}/></small></span></button>
   <button data-action="nonaggression" disabled={hasNonAggression||relation.status==='war'||player.economy.treasury<scaledCostB(player,BASE_COST_B.nonAggression)||relation.score<25} onClick={()=>requestDecision('non_aggression',()=>state.signNonAggression(selected.id))}><CivicArt kind="letter" size={34}/><span><LocaleText value={hasNonAggression?'Non-Aggression Active':'Non-Aggression'}/> <small><LocaleText value={hasNonAggression?'mutual restraint active':relation.score<25?'requires REL 63/100':`-${cost(BASE_COST_B.nonAggression)} · mutual restraint`}/></small></span></button>
   <button data-action="alliance" disabled={hasAlliance||relation.status==='war'||player.economy.treasury<scaledCostB(player,BASE_COST_B.alliance)||relation.score<60} onClick={()=>requestDecision('alliance',()=>state.signAlliance(selected.id))}><CivicArt kind="bloc" size={34}/><span><LocaleText value={hasAlliance?'Alliance Active':'Alliance'}/> <small><LocaleText value={hasAlliance?'strategic alignment active':relation.score<60?'requires REL 80/100':`-${cost(BASE_COST_B.alliance)} · high trust`}/></small></span></button>
   <button data-action="embargo" className={relation.sanctions?'danger active':'danger'} disabled={relation.status==='war'} onClick={()=>requestDecision('embargo',()=>state.toggleEmbargo(selected.id))}><CivicArt kind="war" size={34}/><span><LocaleText value={relation.sanctions?'Lift Embargo':'Impose Embargo'}/> <small><LocaleText value={relation.sanctions?'restore access':'trade cancelled · relations fall'}/></small></span></button>
   <button data-action="bloc" disabled={!canAlign} title={translateLive(blocMember?'Already in your bloc':blocRequirement)} onClick={()=>requestDecision('strategic_bloc',()=>playerBloc?state.inviteToBloc(selected.id):state.formBloc(selected.id))}><CivicArt kind="bloc" size={34}/><span><LocaleText value={blocMember?'Bloc Member':playerBloc?'Invite to Bloc':'Form Strategic Bloc'}/> <small><LocaleText value={blocMember?'alignment active':canAlign?(playerBloc?'expand strategic alignment':`-${formatCostB(blocCost)} · strategic alignment`):blocRequirement}/></small></span></button>
  </div>

  <div className="subhead"><LocaleText value={"GOODWILL & AID"}/></div>
  <div className="goodwill-grid">
   <div className="goodwill-card"><CivicArt kind="gold" size={56}/><small><LocaleText value={"TREASURY GRANT"}/></small><strong><LocaleText value={"Fast diplomatic recovery"}/></strong><p><LocaleText value={"Direct financial support creates immediate goodwill. Larger grants create stronger diplomatic movement."}/></p><div>{([1,5,10] as const).map(amount=><button key={amount} disabled={player.economy.treasury<amount||relation.status==='war'} onClick={()=>requestDecision('treasury_aid',()=>state.giftTreasury(selected.id,amount),{amountB:amount})}><LocaleText value={"$"}/><LocaleText value={amount}/><LocaleText value={"B"}/></button>)}</div></div>
   <div className="goodwill-card"><CivicArt kind="food_relief" size={56}/><small><LocaleText value={"RESOURCE AID"}/></small><strong><LocaleText value={"Support strategic shortages"}/></strong><p><LocaleText value={"Resource shipments improve relations and are more effective when the recipient is genuinely short."}/></p><div>{resources.map(resource=><button key={resource} disabled={player.resources[resource]<=0||relation.status==='war'} onClick={()=>requestDecision('resource_aid',()=>state.giftResource(selected.id,resource),{resource})}><ResourceIcon resource={resource} size={14}/><LocaleText value={resource.toUpperCase()}/></button>)}</div></div>
  </div>

  <p className="diplomacy-rule-note"><LocaleText value={"Trade and aid improve bilateral trust over time. Embassies accelerate diplomatic access and commercial trust. Cooperation with a state's hostile rival can reduce your standing with that rival. Below 10/100, relations are openly hostile."}/></p>

  <div className="subhead"><LocaleText value={"ACTIVE TRADE FLOWS"}/></div>
  {tradeDeals.length>0?<div className="deal-list">{tradeDeals.map(d=><div key={d.id}><span><LocaleText value={d.resource.toUpperCase()}/> <LocaleText value={d.quantityPerDay.toFixed(2)}/><LocaleText value={"/day @ $"}/><LocaleText value={d.pricePerUnit.toFixed(3)}/> <LocaleText value={d.contractType==='long_term'?(`· ${d.contractYears}Y`):''}/></span><button onClick={()=>state.cancelTrade(d.id)}><LocaleText value={"Cancel"}/></button></div>)}</div>:<p className="muted tiny"><LocaleText value={"No active bilateral commodity flow."}/></p>}
  {pendingDecision&&<StrategicDecisionModal spec={pendingDecision.spec} onCancel={()=>setPendingDecision(null)} onConfirm={()=>{pendingDecision.execute();setPendingDecision(null);}}/>}
 </div>;
}
