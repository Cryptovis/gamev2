import {useState} from 'react';
import {useWorldView} from '../../store/useWorldView';
import {ALERT_CATEGORIES,ALERT_STATUS_TITLE,commandAlerts,newsEntries,sentenceCase as sentenceCaseOf,type AlertCategory} from '../../store/commandIntelligence';
import {MARKET_RESOURCES,resourceReserveDays,resourceStrategicStatus} from '../../store/marketSelectors';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {useGameStore} from '../../store/gameStore';
import {CommandArt} from '../icons/CommandArt';
import {ResourceIcon} from '../icons/GameIcons';
import {AircraftGlyph} from '../icons/AircraftIcons';
import {newsFlightKind} from '../../map/flightPresentation';
import {gameDate} from '../../engine/systems/leadership';
import {money} from '../formatMoney';
const sentenceCase=(text:string)=>sentenceCaseOf(text,useGameStore.getState().playerProfile.language);
const names={all:'All alerts',resources:'Resources',finance:'Finance',security:'Security',domestic:'Domestic',diplomacy:'Diplomacy'};
const art={all:'intel',resources:'production',finance:'treasury',security:'military',domestic:'stability',diplomacy:'diplomacy'};
export function CommandAlerts(){
 const s=useWorldView(),p=s.countries[s.playerCountryId],alerts=commandAlerts(s),[category,setCategory]=useState<'all'|AlertCategory>('all');
 const visible=category==='all'?alerts:alerts.filter(a=>a.category===category);
 return <div className="command-alerts"><div className="alert-categories">{(['all',...ALERT_CATEGORIES] as const).map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}><CommandArt kind={art[c]} size={22}/><LocaleText value={names[c]}/><b>{c==='all'?alerts.length:alerts.filter(a=>a.category===c).length}</b></button>)}</div>
 <div className="command-alert-list">{visible.map(a=><article key={a.id} className={a.severity}>{a.resource?<ResourceIcon resource={a.resource} size={28}/>:<CommandArt kind={art[a.category]} size={28}/>}<div><small><LocaleText value={a.severity==='critical'?'Critical':a.severity==='warning'?'Warning':'Information'}/> · <LocaleText value={names[a.category]}/></small><strong>{a.resource&&<>{sentenceCase(translateLive(a.resource))} · </>}<LocaleText value={ALERT_STATUS_TITLE[a.title]??a.title}/></strong><span><LocaleText value={a.value}/>{a.resource&&<> <LocaleText value="Days"/></>}</span></div><button onClick={()=>a.panel==='diplomacy-inbox'?s.routeWorkspace({kind:'diplomatic-inbox',tab:a.id==='offers'?'offers':'correspondence'}):s.navigate(a.panel,p.id)}><LocaleText value="Inspect"/></button></article>)}</div>
 {!visible.length&&<p className="command-empty"><LocaleText value="No current alerts in this category. Monitoring continues."/></p>}
 {category==='resources'&&<div className="resource-alert-list">{MARKET_RESOURCES.map(resource=><div key={resource}><ResourceIcon resource={resource} size={22}/><span><strong><LocaleText value={resource}/></strong><small><LocaleText value={resourceStrategicStatus(p,resource)}/></small></span><em>{resourceReserveDays(p,resource)>365?'365+':Math.max(0,resourceReserveDays(p,resource)).toFixed(0)} <LocaleText value="Days"/></em></div>)}</div>}</div>;
}
export function CommandNews(){
 const s=useWorldView(),p=s.countries[s.playerCountryId],entries=newsEntries(s);
 const wars=Object.values(s.wars).filter(w=>w.status==='active').length,trades=Object.values(s.tradeDeals).filter(t=>t.active&&(t.buyerId===p.id||t.sellerId===p.id)).length+Object.values(s.industrialContracts).filter(t=>t.active&&(t.buyerId===p.id||t.sellerId===p.id)).length,allies=Object.values(p.diplomacy.relations).filter(r=>r.treaties.includes('alliance')).length;
 return <div className="command-news"><header><h3><LocaleText value="Daily command briefing"/></h3><p><LocaleText value={p.name}/> · {gameDate(s)}</p><small><LocaleText value="Current indicators; recorded events appear below."/></small></header>
 <div className="news-metrics">{[['Treasury',money(p.economy.treasury,s.playerProfile.language),'treasury'],['Active world wars',wars,'military'],['Active trade flows',trades,'economy'],['Alliance treaties',allies,'diplomacy']].map(([title,value,kind])=><article key={title}><CommandArt kind={String(kind)} size={28}/><small><LocaleText value={title}/></small><strong><LocaleText value={value}/></strong></article>)}</div>
 <div className="news-links"><button onClick={()=>s.openTool('pulse')}><CommandArt kind="world" size={22}/><LocaleText value="World activities"/></button><button onClick={()=>s.openTool('alerts')}><CommandArt kind="intel" size={22}/><LocaleText value="National Alerts"/></button></div>
 <h4><LocaleText value="Recorded events"/></h4><div className="command-news-archive">{entries.map(e=>{const flight=newsFlightKind(e.message);return <article key={e.id}><small>{flight?<AircraftGlyph kind={flight} size={16}/>:<CommandArt kind="intel" size={18}/>}<LocaleText value={e.day===null?'Campaign messages':'Day'}/>{e.day!==null&&` ${e.day}`}</small><p><LocaleText value={e.message}/></p></article>;})}</div>
 {!entries.length&&<p className="command-empty"><LocaleText value="No recorded events yet. Trade, diplomacy and world developments will appear here."/></p>}</div>;
}
