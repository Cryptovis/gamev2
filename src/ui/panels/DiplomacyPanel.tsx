import { blocForCountry } from '../../engine/systems/blocs';
import { relationFor, relationshipIndex, relationshipStance } from '../../engine/systems/diplomacy';
import type { TradeResource } from '../../domain/game';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { ResourceIcon } from '../icons/GameIcons';

const resources:TradeResource[]=['food','oil','iron','uranium'];
const humanize=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase());

export function DiplomacyPanel({selectedId}:{selectedId:string}){
 const state=useGameStore();
 const player=state.countries[state.playerCountryId];
 const selected=state.countries[selectedId];
 if(!player||!selected)return null;
 const isPlayer=selected.id===player.id;
 if(isPlayer)return <div className="diplomacy-home-empty"><small>BILATERAL RELATIONS</small><strong>Select another sovereign state</strong><p>Choose a country on the map to negotiate trade, aid, treaties and strategic cooperation.</p></div>;

 const relation=relationFor(player,selected.id);
 const relationScore=relationshipIndex(relation);
 const relationLabel=relationshipStance(relation);
 const playerBloc=blocForCountry(state,player.id);
 const tradeDeals=Object.values(state.tradeDeals).filter(d=>d.active&&((d.sellerId===selected.id&&d.buyerId===player.id)||(d.buyerId===selected.id&&d.sellerId===player.id)));

 return <div className="diplomacy-v2">
  <div className={`relation-hero stance-${relationLabel.toLowerCase().replaceAll(' ','-')}`}>
   <div className="relation-flags"><span>{flagEmoji(player.iso2)}</span><i>↔</i><span>{flagEmoji(selected.iso2)}</span></div>
   <div className="relation-copy"><small>BILATERAL RELATIONSHIP INDEX</small><strong>{relationScore}<em>/100</em></strong><span>{relationLabel}</span></div>
   <div className="relation-meter"><i><b style={{width:`${relationScore}%`}}/></i><div><span>HOSTILE</span><span>NEUTRAL</span><span>PARTNER</span></div></div>
  </div>

  <div className="relation-context">
   <span><small>CURRENT STATUS</small><strong>{relation.status.toUpperCase()}</strong></span>
   <span><small>ACTIVE TREATIES</small><strong>{relation.treaties.length?relation.treaties.map(humanize).join(' · '):'None'}</strong></span>
   <span><small>SANCTIONS</small><strong>{relation.sanctions?'ACTIVE':'NONE'}</strong></span>
  </div>

  <div className="subhead">DIPLOMATIC ACTIONS</div>
  <div className="action-grid diplomacy-actions">
   <button onClick={()=>state.improveRelations(selected.id)}>Diplomatic Mission <small>-$2B · gradual goodwill</small></button>
   <button onClick={()=>state.signTradePact(selected.id)}>Trade Pact <small>-$5B · improves commerce</small></button>
   <button onClick={()=>state.signNonAggression(selected.id)}>Non-Aggression <small>-$4B</small></button>
   <button onClick={()=>state.signAlliance(selected.id)}>Alliance <small>-$10B · high trust</small></button>
   <button className={relation.sanctions?'danger active':'danger'} onClick={()=>state.toggleEmbargo(selected.id)}>{relation.sanctions?'Lift Embargo':'Impose Embargo'}</button>
   <button onClick={()=>playerBloc?state.inviteToBloc(selected.id):state.formBloc(selected.id)}>{playerBloc?'Invite to Bloc':'Form Strategic Bloc'}</button>
  </div>

  <div className="subhead">GOODWILL & AID</div>
  <div className="goodwill-grid">
   <div className="goodwill-card"><small>TREASURY GRANT</small><strong>Fast diplomatic recovery</strong><p>Direct financial support creates immediate goodwill. Larger grants create stronger diplomatic movement.</p><div>{([1,5,10] as const).map(amount=><button key={amount} disabled={player.economy.treasury<amount||relation.status==='war'} onClick={()=>state.giftTreasury(selected.id,amount)}>${amount}B</button>)}</div></div>
   <div className="goodwill-card"><small>RESOURCE AID</small><strong>Support strategic shortages</strong><p>Resource shipments improve relations and are more effective when the recipient is genuinely short.</p><div>{resources.map(resource=><button key={resource} disabled={player.resources[resource]<=0||relation.status==='war'} onClick={()=>state.giftResource(selected.id,resource)}><ResourceIcon resource={resource} size={14}/>{resource.toUpperCase()}</button>)}</div></div>
  </div>

  <p className="diplomacy-rule-note">Trade and aid improve bilateral trust over time. Cooperation with a state's hostile rival can reduce your standing with that rival. Below 10/100, relations are openly hostile.</p>

  <div className="subhead">ACTIVE TRADE FLOWS</div>
  {tradeDeals.length>0?<div className="deal-list">{tradeDeals.map(d=><div key={d.id}><span>{d.resource.toUpperCase()} {d.quantityPerDay.toFixed(2)}/day @ ${d.pricePerUnit.toFixed(3)} {d.contractType==='long_term'?(`· ${d.contractYears}Y`):''}</span><button onClick={()=>state.cancelTrade(d.id)}>Cancel</button></div>)}</div>:<p className="muted tiny">No active bilateral commodity flow.</p>}
 </div>;
}
