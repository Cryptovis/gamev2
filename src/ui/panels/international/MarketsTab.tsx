import {useEffect,useState} from 'react';
import type {GameState} from '../../../domain/game';
import type {OilQuotaEffect} from '../../../domain/organizations';
import {economicEffects,effectActive} from '../../../engine/systems/organizations/effectSelectors';
import {activeOilQuota,constrainedOilOutput} from '../../../engine/systems/organizations/quotas';
import {economicEffectMetrics,quotaDeviationView,ORGANIZATION_LABELS} from '../../../engine/systems/organizations/previews';
import {integrationBenefits} from '../../../engine/systems/organizations/marketIntegration';
import {LocaleText,translateLive,formatLive} from '../../../i18n/localeText';
import {Badge,Metrics,ReviewedAction,type ReviewAction} from './shared';
function QuotaControl({state,effect,onReview}:{state:GameState;effect:OilQuotaEffect;onReview:ReviewAction}){
 const current=effect.allowedDeviationByCountry[state.playerCountryId]??0,[deviation,setDeviation]=useState(current),view=quotaDeviationView(state,deviation);
 useEffect(()=>setDeviation(current),[effect.id,current]);
 return <div className="ia-quota-control"><label className="ia-field"><span><LocaleText value="Daily quota deviation"/></span><input aria-label={translateLive('Daily quota deviation')} type="range" min={0} max={view.maxDeviation} step="any" value={deviation} onChange={e=>setDeviation(Number(e.target.value))} aria-valuetext={formatLive('Extraction {0}; standing penalty {1}',[view.output.toFixed(4),view.standingPenalty.toFixed(2)])}/></label>
  <div role="status"><Metrics rows={[["Daily deviation",deviation.toFixed(4)],["Projected daily extraction",view.output.toFixed(4)],["Daily standing penalty",view.standingPenalty.toFixed(2)]]}/></div>
  <ReviewedAction state={state} command={{type:'organization/setOilQuotaDeviation',deviation}} onReview={onReview} label="Review deviation"/>
 </div>;
}
export function MarketsTab({state,onReview}:{state:GameState;onReview:ReviewAction}){
 const effects=economicEffects(state).filter(e=>effectActive(state,e)),quota=activeOilQuota(state,state.playerCountryId);
 return <>
  {quota&&<section className="ia-card"><h3><LocaleText value="Your OPEC+ quota control"/></h3><QuotaControl state={state} effect={quota} onReview={onReview}/></section>}
  {!effects.length&&<p className="ia-empty"><LocaleText value="No active quota, trade remedy, integration or currency swap."/></p>}
  {effects.map(e=><article className="ia-card" key={e.id}><header className="ia-card-header"><div><small><LocaleText value={ORGANIZATION_LABELS[e.organizationId]}/></small><h3><LocaleText value={e.kind==='organizationOilQuota'?'Oil output quota':e.kind==='organizationTradeRemedy'?'Trade countermeasure':e.kind==='organizationMarketIntegration'?'Regional market agreement':'Local-currency swap'}/> <code>{e.id}</code></h3></div><Badge value={e.status}/></header>
   <Metrics rows={economicEffectMetrics(e)}/>
   {e.kind==='organizationOilQuota'&&<div className="ia-roster">{Object.keys(e.quotas).filter(id=>activeOilQuota(state,id)?.id===e.id).map(id=><article key={id}><strong><LocaleText value={state.countries[id].name}/></strong><Metrics rows={[["Daily oil quota",String(e.quotas[id])],["Daily extraction",constrainedOilOutput(state,id).toFixed(4)],["Standing",(state.world.organizations.byId.opecPlus.standingByCountry[id]??0).toFixed(1)]]}/></article>)}</div>}
   {e.kind==='organizationTradeRemedy'&&<p><LocaleText value="Target"/>: <LocaleText value={state.countries[e.remedy.targetId].name}/> · <LocaleText value={e.remedy.commodity.replaceAll('_',' ')}/></p>}
   {e.kind==='organizationMarketIntegration'&&<><div className="ia-tags">{e.agreement.countryIds.map(id=><span key={id}><LocaleText value={state.countries[id].name}/></span>)}</div>
    <Metrics rows={[["Trade friction multiplier",integrationBenefits(state,e.agreement.countryIds[0],e.agreement.countryIds[1]).frictionMultiplier.toFixed(3)],["Trade volume multiplier",integrationBenefits(state,e.agreement.countryIds[0],e.agreement.countryIds[1]).volumeMultiplier.toFixed(3)]]}/>
   </>}
   {e.kind==='organizationCurrencySwap'&&<div className="ia-roster">{Object.entries(e.localBalanceByCountry).map(([id,balance])=><article key={id}><strong><LocaleText value={state.countries[id].name}/></strong><span><LocaleText value="Local clearing balance ($B)"/> {balance.toFixed(4)}</span></article>)}</div>}
  </article>)}
 </>;
}
