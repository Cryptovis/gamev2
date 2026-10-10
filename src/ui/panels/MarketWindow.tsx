import {useState,useRef,useEffect} from 'react';
import {useWorldView} from '../../store/useWorldView';
import {translateLive} from '../../i18n/localeText';
import {NavigationArt} from '../icons/NavigationArt';
import {CommandArt} from '../icons/CommandArt';
import {CivicArt} from '../icons/CivicArt';
import {DraggableWindow} from '../windows/DraggableWindow';
import {SectionMenu} from '../windows/SectionMenu';
import {OpenExchange} from './OpenExchange';
import {CommodityExchangePanel} from './CommodityExchangePanel';
// Frequently used core panels travel with the shell; no click-time WebContainer fetch.
import {CreditWindow} from './CreditWindow';
import {IndustrialMarketPanel} from './IndustrialMarketPanel';
import {SupplierFinder} from './TradeDesk';
const items=[
 {id:'open',label:'Open Market & Precious Metals',icon:<NavigationArt kind="market" size={28}/>},
 {id:'exchange',label:'Commodity Exchange',icon:<CivicArt kind="gold" size={28}/>},
 {id:'credit',label:'Sovereign Credit & Monetary Fund',icon:<CommandArt kind="treasury" size={32}/>},
 {id:'suppliers',label:'Trade partners',icon:<CivicArt kind="trade" size={28}/>},
 {id:'contracts',label:'Supply contracts',icon:<NavigationArt kind="world" size={28}/>},
];
export function MarketWindow() {
 const s=useWorldView();
 const [section,setSection]=useState('open');
 const selected=s.activeTool==='exchange'?'exchange':s.activeTool==='credit'?'credit':section;
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{content.current?.scrollTo({top:0,left:0});},[selected]);
 const select=(id:string)=>{setSection(id);s.openTool(id==='exchange'?'exchange':id==='credit'?'credit':'market');};
 return <DraggableWindow id="market-window" kicker="GLOBAL ECONOMY" title={translateLive('Global Commodity & Industrial Market')} initialX={96} initialY={110} width={1040} onClose={s.closeWorkspace}>
  <SectionMenu items={items} selected={selected} onSelect={select} contentId="market-section-content"/>
  <div ref={content} id="market-section-content" className="market-section-content" data-section={selected} role="region" aria-label={translateLive(items.find(i=>i.id===selected)!.label)}>
   {selected==='open'&&<OpenExchange/>}
   {selected==='exchange'&&<CommodityExchangePanel/>}
   {selected==='credit'&&<CreditWindow embedded/>}
   {selected==='suppliers'&&<SupplierFinder/>}
   {selected==='contracts'&&<IndustrialMarketPanel contractsOnly/>}
  </div>
 </DraggableWindow>;
}
