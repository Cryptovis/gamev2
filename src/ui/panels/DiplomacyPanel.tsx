import { useState } from 'react';
import { blocForCountry } from '../../engine/systems/blocs';
import { embassyFor, relationFor, relationshipIndex, relationshipStance } from '../../engine/systems/diplomacy';
import type { TradeResource } from '../../domain/game';
import type { StrategicActionKind, StrategicDecisionSpec } from '../../domain/interaction';
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
 if(isPlayer)return <div className="diplomacy-home-empty"><small>BILATERAL RELATIONS</small><strong>Select another sovereign state</strong><p>Choose a country on the map to negotiate trade, aid, treaties and strategic cooperation.</p></div>;

 const relation=relationFor(player,selected.id);
 const relationScore=relationshipIndex(relation);
 const relationLabel=relationshipStance(relation);
 const playerBloc=blocForCountry(state,player.id);
 const embassy=embassyFor(state,player.id,selected.id);
 const tradeDeals=Object.values(state.tradeDeals).filter(d=>d.active&&((d.sellerId===selected.id&&d.buyerId===player.id)||(d.buyerId===selected.id&&d.sellerId===player.id)));
 const hasTrade=relation.treaties.includes('trade');
 const hasNonAggression=relation.treaties.includes('nonAggression');
 const hasAlliance=relation.treaties.includes('alliance');
 const requestDecision=(kind:StrategicActionKind,execute:()=>void,context:StrategicDecisionContext={})=>{
  if(state.confirmationSkips[kind]){execute();return;}
  const spec=strategicDecisionSpec(state,kind,selected.id,context);
  if(!spec){execute();return;}
  setPendingDecision({spec,execute});
 };

 return <div className="diplomacy-v2">
  <div className={`relation-hero stance-${relationLabel.toLowerCase().replaceAll(' ','-')}`}>
   <div className="relation-flags"><span>{flagEmoji(player.iso2)}</span><i>↔</i><span>{flagEmoji(selected.iso2)}</span></div>
   <div className="relation-copy"><small>BILATERAL RELATIONSHIP INDEX</small><strong>{relationScore}<em>/100</em></strong><span>{relationLabel}</span></div>
   <div className="relation-meter"><i><b style={{width:`${relationScore}%`}}/></i><div><span>HOSTILE</span><span>NEUTRAL</span><span>PARTNER</span></div></div>
  </div>

  <div className="relation-context">
   <span><small>CURRENT STATUS</small><strong>{relation.status.toUpperCase()}</strong></span>
   <span><small>ACTIVE TREATIES</small><strong>{relation.treaties.length?relation.treaties.map(humanize).join(' · '):'None'}</strong></span>
   <span><small>EMBASSY</small><strong>{embassy?`LEVEL ${embassy.level}`:'NONE'}</strong></span>
  </div>

  <div className="subhead">DIPLOMATIC ACTIONS</div>
  <div className="action-grid diplomacy-actions">
   <button data-action="mission" disabled={player.economy.treasury<2||relation.status==='war'} onClick={()=>requestDecision('diplomatic_mission',()=>state.improveRelations(selected.id))}><DiplomacyIcon size={16}/><span>Diplomatic Mission <small>-$2B · gradual goodwill</small></span></button>
   <button data-action="embassy" disabled={Boolean(embassy)||player.economy.treasury<3||relation.status==='war'} onClick={()=>requestDecision('embassy',()=>state.openEmbassyWith(selected.id))}><EmbassyIcon size={16}/><span>{embassy?'Embassy Established':'Open Embassy'} <small>{embassy?'relations & trade boosted':'-$3B · diplomatic booster'}</small></span></button>
   <button data-action="trade" disabled={hasTrade||player.economy.treasury<5||relation.status==='war'} onClick={()=>requestDecision('trade_pact',()=>state.signTradePact(selected.id))}><DiplomacyIcon size={16}/><span>{hasTrade?'Trade Pact Active':'Trade Pact'} <small>{hasTrade?'commercial framework active':'-$5B · improves commerce'}</small></span></button>
   <button data-action="nonaggression" disabled={hasNonAggression||relation.status==='war'||player.economy.treasury<4} onClick={()=>requestDecision('non_aggression',()=>state.signNonAggression(selected.id))}><DiplomacyIcon size={16}/><span>{hasNonAggression?'Non-Aggression Active':'Non-Aggression'} <small>{hasNonAggression?'mutual restraint active':'-$4B · mutual restraint'}</small></span></button>
   <button data-action="alliance" disabled={hasAlliance||relation.status==='war'||player.economy.treasury<10} onClick={()=>requestDecision('alliance',()=>state.signAlliance(selected.id))}><BlocIcon size={16}/><span>{hasAlliance?'Alliance Active':'Alliance'} <small>{hasAlliance?'strategic alignment active':'-$10B · high trust'}</small></span></button>
   <button data-action="embargo" className={relation.sanctions?'danger active':'danger'} disabled={relation.status==='war'} onClick={()=>requestDecision('embargo',()=>state.toggleEmbargo(selected.id))}><WarIcon size={16}/><span>{relation.sanctions?'Lift Embargo':'Impose Embargo'} <small>{relation.sanctions?'restore access':'trade cancelled · relations fall'}</small></span></button>
   <button data-action="bloc" disabled={relation.status==='war'} onClick={()=>requestDecision('strategic_bloc',()=>playerBloc?state.inviteToBloc(selected.id):state.formBloc(selected.id))}><BlocIcon size={16}/><span>{playerBloc?'Invite to Bloc':'Form Strategic Bloc'} <small>high-impact alignment</small></span></button>
  </div>

  <div className="subhead">GOODWILL & AID</div>
  <div className="goodwill-grid">
   <div className="goodwill-card"><small>TREASURY GRANT</small><strong>Fast diplomatic recovery</strong><p>Direct financial support creates immediate goodwill. Larger grants create stronger diplomatic movement.</p><div>{([1,5,10] as const).map(amount=><button key={amount} disabled={player.economy.treasury<amount||relation.status==='war'} onClick={()=>requestDecision('treasury_aid',()=>state.giftTreasury(selected.id,amount),{amountB:amount})}>${amount}B</button>)}</div></div>
   <div className="goodwill-card"><small>RESOURCE AID</small><strong>Support strategic shortages</strong><p>Resource shipments improve relations and are more effective when the recipient is genuinely short.</p><div>{resources.map(resource=><button key={resource} disabled={player.resources[resource]<=0||relation.status==='war'} onClick={()=>requestDecision('resource_aid',()=>state.giftResource(selected.id,resource),{resource})}><ResourceIcon resource={resource} size={14}/>{resource.toUpperCase()}</button>)}</div></div>
  </div>

  <p className="diplomacy-rule-note">Trade and aid improve bilateral trust over time. Embassies accelerate diplomatic access and commercial trust. Cooperation with a state's hostile rival can reduce your standing with that rival. Below 10/100, relations are openly hostile.</p>

  <div className="subhead">ACTIVE TRADE FLOWS</div>
  {tradeDeals.length>0?<div className="deal-list">{tradeDeals.map(d=><div key={d.id}><span>{d.resource.toUpperCase()} {d.quantityPerDay.toFixed(2)}/day @ ${d.pricePerUnit.toFixed(3)} {d.contractType==='long_term'?(`· ${d.contractYears}Y`):''}</span><button onClick={()=>state.cancelTrade(d.id)}>Cancel</button></div>)}</div>:<p className="muted tiny">No active bilateral commodity flow.</p>}
  {pendingDecision&&<StrategicDecisionModal spec={pendingDecision.spec} onCancel={()=>setPendingDecision(null)} onConfirm={()=>{pendingDecision.execute();setPendingDecision(null);}}/>}
 </div>;
}
