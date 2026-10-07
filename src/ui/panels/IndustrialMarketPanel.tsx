import {AssetThumbnail} from '../icons/AssetThumbnail';
import {ReviewDialog} from './ReviewDialog';
import {useState} from 'react';
import type {IndustrialGood} from '../../domain/industrial';
import {GOODS} from '../../data/industrialCatalog';
import {goodStock} from '../../engine/systems/industrialEconomy';
import {industrialPrice,industrialQuote,canTradeIndustrial} from '../../engine/systems/industrialMarket';
import {useGameStore} from '../../store/gameStore';
import {IndustryIcon} from '../icons/GameIcons';

export function IndustrialMarketPanel(){
 const [cancelId,setCancelId]=useState<string|null>(null);
 const state=useGameStore(),player=state.countries[state.playerCountryId];
 const [good,setGood]=useState<IndustrialGood>('water'),[partner,setPartner]=useState(''),[direction,setDirection]=useState<'buy'|'sell'>('buy'),[quantity,setQuantity]=useState(5),[years,setYears]=useState<0|1|3|5|10>(0),[review,setReview]=useState(false);
 const eligible=Object.values(state.countries).filter(c=>canTradeIndustrial(state,direction==='buy'?c.id:player.id,direction==='buy'?player.id:c.id,good));
 const target=eligible.find(c=>c.id===partner)??eligible[0];
 const sellerId=direction==='buy'?target?.id??'':player.id,buyerId=direction==='buy'?player.id:target?.id??'';
 const quote=industrialQuote(state,sellerId,buyerId,good,quantity);
 const contracts=Object.values(state.industrialContracts).filter(c=>c.active&&(c.sellerId===player.id||c.buyerId===player.id));
 const duplicate=years!==0&&contracts.some(c=>c.sellerId===sellerId&&c.buyerId===buyerId&&c.good===good);
 const error=duplicate?'A supply contract already exists for this route':quote.error;
 return <section className="industrial-market">
  <header className="industrial-heading"><IndustryIcon size={27}/><div><small>COMMODITIES / COMPONENTS / DEFENSE</small><h3>Industrial Exchange</h3><p>Buy supplies or sell reserves. Every shipment transfers real stock and treasury.</p></div></header>
  <div className="exchange-board">{(Object.entries(GOODS) as Array<[IndustrialGood,typeof GOODS[IndustrialGood]]>).map(([id,d])=><button key={id} className={good===id?'selected':''} onClick={()=>{setGood(id);setReview(false);setPartner('')}}><AssetThumbnail asset={id} size={56}/><span>{d.label}</span><b>${industrialPrice(state,id).toFixed(3)}B</b><small>OWN {goodStock(state,player.id,id).toFixed(1)}</small></button>)}</div>
  <div className="exchange-order"><label>TRADE DIRECTION<select value={direction} onChange={e=>{setDirection(e.target.value as 'buy'|'sell');setReview(false)}}><option value="buy">Buy / secure imports</option><option value="sell">Sell / export surplus</option></select></label><label>PARTNER<select value={target?.id??''} onChange={e=>{setPartner(e.target.value);setReview(false)}}>{!eligible.length&&<option value="">No eligible trade partner</option>}{eligible.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>QUANTITY PER DELIVERY<input aria-label="Industrial order quantity" type="number" min="1" max="1000" step="1" value={quantity} onChange={e=>{setQuantity(Math.max(1,Math.min(1000,Math.floor(Number(e.target.value)||1))));setReview(false)}}/></label><label>TERM<select value={years} onChange={e=>{setYears(Number(e.target.value) as typeof years);setReview(false)}}><option value={0}>Immediate shipment</option>{[1,3,5,10].map(y=><option key={y} value={y}>{y} years · monthly delivery</option>)}</select></label></div>
  <p className="exchange-context">{good==='tanks'?'Armored vehicle transfers require an alliance and a trade pact.':'A trade pact is required. Sanctions and war suspend access.'} Supplier reserves are protected. Prices respond to global inventory.</p>
  <div className="order-summary"><span><small>UNIT PRICE</small><b>${quote.price.toFixed(3)}B</b></span><span><small>SHIPMENT VALUE</small><b>${quote.cost.toFixed(3)}B</b></span><span><small>EXPORTABLE STOCK</small><b>{quote.available.toFixed(1)}</b></span></div>
  {error&&<p className="exchange-error">{error}</p>}
  {!review?<button className="exchange-review" disabled={Boolean(error)} onClick={()=>setReview(true)}>REVIEW {direction==='buy'?'IMPORT':'EXPORT'}</button>:<div className="exchange-confirm"><strong>{direction==='buy'?'Import from':'Export to'} {target?.name}</strong><p>{quantity} {GOODS[good].label} · ${quote.cost.toFixed(3)}B {years?'per monthly shipment at a locked unit price; stock and payment settle on delivery':'paid now'}. {years?'Supply is conditional on available stock, treasury and diplomatic access.':'Stocks move immediately.'}</p><button onClick={()=>setReview(false)}>CANCEL</button><button disabled={Boolean(error)} onClick={()=>{if(target&&!error)state.placeIndustrialOrder(target.id,good,quantity,direction,years);setReview(false)}}>CONFIRM ORDER</button></div>}
  <div className="subhead">SECURED SUPPLY CONTRACTS</div><div className="industrial-contract-list">{contracts.map(c=><article key={c.id}><strong>{GOODS[c.good].label} · {state.countries[c.sellerId].name} → {state.countries[c.buyerId].name}</strong><small>{c.quantity}/month · ${c.price.toFixed(3)}B per unit · next D{c.nextDeliveryDay} · ends D{c.expiresDay} · missed {c.missedDeliveries}</small><button onClick={()=>setCancelId(c.id)}>CANCEL CONTRACT</button></article>)}{!contracts.length&&<p>No industrial supply contracts. Choose a term above to secure recurring deliveries.</p>}</div>
 {cancelId&&<ReviewDialog title="Cancel future shipments?" summary="This stops future deliveries. Completed deliveries and payments remain settled." onCancel={()=>setCancelId(null)} confirmLabel="CANCEL CONTRACT" onConfirm={()=>{state.cancelIndustrialContract(cancelId);setCancelId(null);state.showReceipt({title:"Contract cancelled",summary:"Future shipments have been stopped. You can create a replacement order."});}}/>}
 </section>;
}
