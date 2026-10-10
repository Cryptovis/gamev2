import {useState,useRef,useEffect} from 'react';
import {useWorldView} from '../../store/useWorldView';
import {getMarketBoard} from '../../store/marketSelectors';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {money} from '../formatMoney';
import {NavigationArt} from '../icons/NavigationArt';
import {CommandArt} from '../icons/CommandArt';
import {CivicArt} from '../icons/CivicArt';
import {ResourceIcon} from '../icons/GameIcons';
import {DraggableWindow} from '../windows/DraggableWindow';
import {SectionMenu} from '../windows/SectionMenu';
import {recoverableLazy} from '../windows/recoverableLazy';
const OpenExchange=recoverableLazy(()=>import('./OpenExchange'),m=>m.OpenExchange,'OpenExchange');
const CommodityExchangePanel=recoverableLazy(()=>import('./CommodityExchangePanel'),m=>m.CommodityExchangePanel,'CommodityExchangePanel');
// Frequently used core panels travel with the shell; no click-time WebContainer fetch.
import {CreditWindow} from './CreditWindow';
import {IndustrialMarketPanel} from './IndustrialMarketPanel';
const SupplierFinder=recoverableLazy(()=>import('./TradeDesk'),m=>m.SupplierFinder,'TradeDesk');
const items=[
 {id:'open',label:'Open Market & Precious Metals',icon:<NavigationArt kind="market" size={28}/>},
 {id:'exchange',label:'Commodity Exchange',icon:<CivicArt kind="gold" size={28}/>},
 {id:'credit',label:'Sovereign Credit & Monetary Fund',icon:<CommandArt kind="treasury" size={32}/>},
 {id:'suppliers',label:'Trade partners',icon:<CivicArt kind="trade" size={28}/>},
 {id:'contracts',label:'Supply contracts',icon:<NavigationArt kind="world" size={28}/>},
 {id:'prices',label:'World prices',icon:<NavigationArt kind="intel" size={28}/>},
];
export function MarketWindow() {
 const s=useWorldView();
 const [section,setSection]=useState('open');
 const selected=s.activeTool==='exchange'?'exchange':s.activeTool==='credit'?'credit':section;
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{content.current?.scrollTo({top:0,left:0});},[selected]);
 const select=(id:string)=>{setSection(id);s.openTool(id==='exchange'?'exchange':id==='credit'?'credit':'market');};
 const board=selected==='prices'?getMarketBoard(s):[];
 return <DraggableWindow id="market-window" kicker="GLOBAL ECONOMY" title={translateLive('Global Commodity & Industrial Market')} initialX={96} initialY={110} width={1040} onClose={s.closeWorkspace}>
  <SectionMenu items={items} selected={selected} onSelect={select} contentId="market-section-content"/>
  <div ref={content} id="market-section-content" className="market-section-content" role="region" aria-label={translateLive(items.find(i=>i.id===selected)!.label)}>
   {selected==='open'&&<OpenExchange/>}
   {selected==='exchange'&&<CommodityExchangePanel/>}
   {selected==='credit'&&<CreditWindow embedded/>}
   {selected==='suppliers'&&<SupplierFinder/>}
   {selected==='contracts'&&<IndustrialMarketPanel contractsOnly/>}
   {selected==='prices'&&<div className="floating-market">{board.map(item=><div key={item.resource}><ResourceIcon resource={item.resource} size={28}/><span><small><LocaleText value={item.resource}/></small><strong>{money(item.price,s.playerProfile.language)}</strong></span><em><LocaleText value="WORLD PRICE"/></em></div>)}</div>}
  </div>
 </DraggableWindow>;
}
