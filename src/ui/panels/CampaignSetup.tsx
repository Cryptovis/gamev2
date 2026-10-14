import {LeaderPerkCard} from './LeaderPerkCard';
import {LEADER_PERKS,portraitArchetype} from '../../data/leaderArchetypes';
import {leaderOpeningValues} from '../../engine/systems/leaderPerks';
import {AppearanceOptions} from './AppearanceOptions';
import {BrandMark,BRAND_NAME} from '../BrandMark';
import {version} from '../../../package.json';
import {LocaleText,translateLive,translateText} from '../../i18n/localeText';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { LeaderStyleFilter } from '../profile/LeaderStyleFilter';
import { AVATAR_PRESETS, type LeaderStyle } from '../../data/avatarPresets';
import { countryThemeFor, flagEmoji } from '../../data/countryThemes';
import { tr, LANGUAGE_OPTIONS } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import {validBirthDate,CAMPAIGN_START_DATE} from '../../engine/systems/leadership';
import { AvatarPortrait } from '../profile/AvatarPortrait';
import { compactMoney } from '../formatMoney';
import { nextLeadershipQuote } from '../../data/leadershipQuotes';

type SetupStep=1|2|3|4|'loading';

function countryDifficulty(capability:number,gdp:number){
 const power=capability+Math.min(100,gdp/18);
 if(power>=135)return 'MAJOR POWER';
 if(power>=90)return 'REGIONAL POWER';
 if(power>=55)return 'BALANCED';
 return 'CHALLENGING';
}

export function CampaignSetup({onReturnToMenu}:{onReturnToMenu?:()=>void}={}){
 const profile=useGameStore(s=>s.playerProfile);
 const countries=useGameStore(s=>s.countries);
 const start=useGameStore(s=>s.startCampaign);
 const load=useGameStore(s=>s.loadLatest),saveMessage=useGameStore(s=>s.saveMessage);
 const [step,setStep]=useState<SetupStep>(1);
 const language=profile.language;
 const [quote]=useState(()=>{let previous:string|null=null;try{previous=localStorage.getItem('trp-last-leadership-quote');}catch{}return nextLeadershipQuote(Math.random(),previous);});
 useEffect(()=>{try{localStorage.setItem('trp-last-leadership-quote',quote.id);}catch{}},[quote.id]);
 const [name,setName]=useState(profile.commanderName==='Commander'?'':profile.commanderName);
 const [avatar,setAvatar]=useState(profile.avatarId);
 const [portraitStyle,setPortraitStyle]=useState<LeaderStyle|'all'>('all');
 const [countryId,setCountryId]=useState('TUR');
 const [nationality,setNationality]=useState(profile.nationalityCountryId??'TUR');
 const [birthDate,setBirthDate]=useState(profile.birthDate??'');
 const [query,setQuery]=useState('');
 const [loadingStep,setLoadingStep]=useState(0);

 const list=useMemo(()=>{
  const fold=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replaceAll('ı','i').trim();
  const search=fold(query);
  const all=Object.values(countries),byCode=all.filter(c=>fold(c.iso2)===search||fold(c.id)===search);
  return (byCode.length?byCode:all.filter(c=>[c.name,translateText(language,c.name),...(c.id==='TUR'?['Turkey','Turkiye']:c.id==='MKD'?['Macedonia']:[])].some(name=>fold(name).includes(search)))).sort((a,b)=>translateText(language,a.name).localeCompare(translateText(language,b.name),language));
 },[countries,query,language]);
 const selected=countries[countryId]??countries.TUR;
 const theme=countryThemeFor(selected.iso2);
 const archetype=portraitArchetype(avatar),opening=leaderOpeningValues(selected,archetype);
 const topResources=useMemo(()=>Object.entries(selected.resourceProduction).sort((a,b)=>b[1]-a[1]).slice(0,2),[selected]);

 useEffect(()=>{
  if(step!=='loading')return;
  const timers=[
   window.setTimeout(()=>setLoadingStep(1),450),
   window.setTimeout(()=>setLoadingStep(2),1150),
   window.setTimeout(()=>setLoadingStep(3),1900),
   window.setTimeout(()=>setLoadingStep(4),2600),
   window.setTimeout(()=>start({commanderName:name,countryId:selected.id,avatarId:avatar,language,nationalityCountryId:nationality,birthDate:birthDate||null}),3350),
  ];
  return ()=>timers.forEach(window.clearTimeout);
 },[step,start,name,selected.id,avatar,language,nationality,birthDate]);

 if(profile.setupComplete)return null;

 const loadingMessages=[
  tr(language,'loading_1','Establishing national command…'),
  tr(language,'loading_2','Synchronizing cabinet and intelligence channels…'),
  tr(language,'loading_3','Opening markets and diplomatic networks…'),
  tr(language,'loading_4','Final strategic briefing ready.'),
 ];

 if(step==='loading')return <div className="campaign-loading" style={{'--setup-primary':theme.primary,'--setup-accent':theme.accent} as CSSProperties}>
  <div className="loading-world-orbit"><i/><i/><i/></div>
  <section className="loading-command-card">
   <div className="loading-identity"><AvatarPortrait id={avatar} size={124}/><div className="loading-flag"><LocaleText value={flagEmoji(selected.iso2)}/></div></div>
   <small translate="no">{BRAND_NAME}</small>
   <h1><LocaleText value={name.trim()}/><LocaleText value={"'s first day in office begins."}/></h1>
   <p><LocaleText value={selected.name}/><LocaleText value={" is transferring executive command. Markets are opening, diplomats are waiting, and the cabinet is assembling for the first briefing."}/></p>
   <div className="loading-status"><span><LocaleText value={loadingMessages[Math.max(0,loadingStep-1)]??tr(language,'loading_1','Establishing national command…')}/></span><strong><LocaleText value={[8,28,54,78,100][loadingStep]}/><LocaleText value={"%"}/></strong></div>
   <div className="loading-track"><i style={{width:`${[8,28,54,78,100][loadingStep]}%`}}/></div>
   <div className="loading-checks">{loadingMessages.map((message,i)=><div key={message} className={loadingStep>i?'done':''}><b><LocaleText value={loadingStep>i?'✓':'○'}/></b><span><LocaleText value={message}/></span></div>)}</div>
  </section>
 </div>;

 const stepTitle=step===1?tr(language,'step_name','Your identity'):step===2?tr(language,'step_portrait','Choose your portrait'):step===3?tr(language,'step_country','Choose your nation'):tr(language,'step_confirm','Confirm command');

 return <div className="campaign-setup-backdrop campaign-wizard-backdrop" style={{'--setup-primary':theme.primary,'--setup-accent':theme.accent} as CSSProperties}>
  <section className="campaign-wizard" data-step={step}><aside className="setup-cover"><img src="/assets/command/campaign-cover.webp" alt=""/><BrandMark/><span className="entry-tagline"><LocaleText value="Be the president you have always dreamed of."/></span><small>{version}</small></aside>
   <header className="wizard-header"><div><small><span translate="no">{BRAND_NAME}</span><span className="wizard-release">{version}</span></small><h1><LocaleText value={stepTitle}/></h1><p><LocaleText value="Create your leader and choose a country."/></p></div><div className="wizard-stepper">{[1,2,3,4].map(n=><span key={n} className={typeof step==='number'&&step>=n?'active':''}><b><LocaleText value={n}/></b><small><LocaleText value={n===1?'IDENTITY':n===2?'PORTRAIT':n===3?'NATION':'CONFIRM'}/></small></span>)}</div></header>

   <div className="wizard-body">
    {step===1&&<div className="wizard-single-column"><AppearanceOptions/>
      <div className="wizard-intro"><span className="wizard-kicker"><LocaleText value={"STEP 01 / LEADER IDENTITY"}/></span><h2><LocaleText value={"Every era begins with a leader."}/></h2><p><LocaleText value={"Choose the name that will appear in national briefings, diplomatic reports and your command profile."}/></p></div>
      <label className="wizard-name-field"><span><LocaleText value={tr(language,'commander')}/></span><input autoFocus value={name} maxLength={28} placeholder={translateLive("Commander")} onChange={e=>setName(e.target.value)}/></label>
      <div className="wizard-personal-fields"><label><span><LocaleText value={'CITIZENSHIP'}/></span><select aria-label={translateLive("Citizenship")} value={nationality} onChange={e=>setNationality(e.target.value)}>{Object.values(countries).sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}><LocaleText value={c.name}/></option>)}</select><small><LocaleText value={'Your citizenship is independent of the country you choose to govern.'}/></small></label><label><span><LocaleText value={'DATE OF BIRTH'}/></span><input aria-label={translateLive("Date of birth")} type="date" min="1900-01-01" max={CAMPAIGN_START_DATE} value={birthDate} onChange={e=>setBirthDate(e.target.value)}/><small><LocaleText value={'Optional. Campaign calendar begins on 1 January 2026.'}/></small>{birthDate&&!validBirthDate(birthDate)&&<small className="negative"><LocaleText value={"Enter a valid date before the campaign starts."}/></small>}</label></div>
      <figure className="wizard-leadership-quote" data-quote-id={quote.id}><span aria-hidden="true" className="quote-opening">“</span><blockquote><LocaleText value={quote.text[language]}/></blockquote><span aria-hidden="true" className="quote-closing">”</span><figcaption>— {quote.author}</figcaption></figure>
    </div>}

    {step===2&&<div className="wizard-portrait-stage">
      <div className="wizard-intro compact"><span className="wizard-kicker"><LocaleText value={"STEP 02 / COMMAND PROFILE"}/></span></div>
      <LeaderStyleFilter value={portraitStyle} onChange={setPortraitStyle} turkish={language==='tr'}/><div className="wizard-avatar-layout"><div className="wizard-avatar-grid">{AVATAR_PRESETS.filter(a=>portraitStyle==='all'||a.category===portraitStyle).map(a=><button key={a.id} aria-pressed={avatar===a.id} className={avatar===a.id?'active':''} onClick={()=>setAvatar(a.id)}><AvatarPortrait id={a.id} size={72}/><span><LocaleText value={a.label}/></span><small className="avatar-perk-name"><LocaleText value={LEADER_PERKS[portraitArchetype(a.id)].title}/></small></button>)}</div><aside className="wizard-avatar-preview"><AvatarPortrait id={avatar} size={152}/><small><LocaleText value={"COMMANDER"}/></small><strong><LocaleText value={name||'Commander'}/></strong><span><LocaleText value={AVATAR_PRESETS.find(a=>a.id===avatar)?.label}/></span><LeaderPerkCard archetype={archetype}/></aside></div>
    </div>}

    {step===3&&<div className="wizard-country-stage">
      <div className="wizard-country-list"><div className="wizard-intro compact"><span className="wizard-kicker"><LocaleText value={"STEP 03 / SOVEREIGN COMMAND"}/></span><h2><LocaleText value={tr(language,'country')}/></h2></div><input aria-label={translateLive(tr(language,'search_country'))} className="country-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={translateLive(tr(language,'search_country'))}/><div className="country-choice-list wizard-country-scroll">{list.map(c=><button key={c.id} aria-pressed={countryId===c.id} className={countryId===c.id?'active':''} onClick={()=>setCountryId(c.id)}><b><LocaleText value={flagEmoji(c.iso2)}/></b><span><strong><LocaleText value={c.name}/></strong><small><LocaleText value={c.region}/><LocaleText value={" · "}/><LocaleText value={c.politics.regime}/></small></span><em><LocaleText value={c.military.assessment.capability.toFixed(0)}/></em></button>)}{!list.length&&<div className="country-search-empty" role="status"><p><LocaleText value="No countries match your search."/></p><button onClick={()=>setQuery('')}><LocaleText value="Clear search"/></button></div>}</div></div>
      <aside className="wizard-country-preview"><div className="nation-flag-hero"><LocaleText value={flagEmoji(selected.iso2)}/></div><small><LocaleText value={selected.region.toUpperCase()}/></small><h2><LocaleText value={selected.name}/></h2><strong className="difficulty-chip"><LocaleText value={countryDifficulty(selected.military.assessment.capability,selected.economy.gdp)}/></strong><div className="wizard-stat-grid"><span><small><LocaleText value={"GDP"}/></small><b><LocaleText value={compactMoney(selected.economy.gdp,language)}/></b></span><span><small><LocaleText value={"POPULATION"}/></small><b><LocaleText value={(selected.demographics.population/1e6).toFixed(1)}/><LocaleText value={"M"}/></b></span><span><small><LocaleText value={"MILITARY"}/></small><b><LocaleText value={selected.military.assessment.capability.toFixed(0)}/></b></span><span><small><LocaleText value={"STABILITY"}/></small><b><LocaleText value={selected.politics.stability.toFixed(0)}/><LocaleText value={"%"}/></b></span></div><div className="opening-profile"><small><LocaleText value={"OPENING PROFILE"}/></small><p><LocaleText value={selected.politics.regime.replaceAll('_',' ')}/><LocaleText value={" · "}/><LocaleText value={selected.society.ideology.replaceAll('_',' ')}/><LocaleText value={" · "}/><LocaleText value={selected.society.dominantReligion.replaceAll('_',' ')}/></p><p><LocaleText value={"Strongest production: "}/><LocaleText value={topResources.map(([r,v])=>`${r.toUpperCase()} ${Number(v).toFixed(1)}`).join(' · ')}/></p></div></aside>
    </div>}

    {step===4&&<div className="wizard-confirm-stage">
      <div className="confirm-leader-card"><div className="confirm-banner" style={{background:`linear-gradient(135deg,${theme.primary},${theme.accent})`}}/><div className="confirm-avatar"><AvatarPortrait id={avatar} size={138}/><span><LocaleText value={flagEmoji(selected.iso2)}/></span></div><small><LocaleText value={"NATIONAL COMMAND NOMINATION"}/></small><h2><LocaleText value={name}/></h2><strong><LocaleText value={selected.name}/></strong><p><LocaleText value={selected.politics.regime.replaceAll('_',' ')}/><LocaleText value={" · "}/><LocaleText value={selected.region}/><LocaleText value={" · "}/><LocaleText value={selected.society.ideology.replaceAll('_',' ')}/></p></div>
      <div className="confirm-brief"><span className="wizard-kicker"><LocaleText value={"STEP 04 / FINAL REVIEW"}/></span><h2><LocaleText value={tr(language,'review_title','Ready to assume command?')}/></h2><p><LocaleText value={"Once confirmed, national systems, diplomacy, markets, intelligence and military command will initialize around this profile."}/></p><div className="confirm-summary-grid"><span><small><LocaleText value={"COMMANDER"}/></small><strong><LocaleText value={name}/></strong></span><span><small><LocaleText value={"CITIZENSHIP"}/></small><strong><LocaleText value={countries[nationality]?.name}/></strong></span><span><small><LocaleText value={"DATE OF BIRTH"}/></small><strong><LocaleText value={birthDate||'Not supplied'}/></strong></span><span><small><LocaleText value={"LANGUAGE"}/></small><strong><LocaleText value={LANGUAGE_OPTIONS.find(x=>x.id===language)?.label}/></strong></span><span><small><LocaleText value={"NATION"}/></small><strong><LocaleText value={flagEmoji(selected.iso2)}/> <LocaleText value={selected.name}/></strong></span><span><small><LocaleText value={"STARTING TREASURY"}/></small><strong><LocaleText value={compactMoney(opening.treasury,language)}/></strong></span><span><small><LocaleText value={"GDP"}/></small><strong><LocaleText value={compactMoney(selected.economy.gdp,language)}/></strong></span><span><small><LocaleText value={"MILITARY CAPABILITY"}/></small><strong><LocaleText value={selected.military.assessment.capability.toFixed(1)}/></strong></span></div><LeaderPerkCard archetype={archetype}/><div className="confirm-message"><LocaleText value={"“Your first briefing is ready. The world will begin reacting the moment you take office.”"}/></div></div>
    </div>}
   </div>

   <footer className="wizard-footer">{step===2&&<p className="wizard-portrait-helper"><LocaleText value="Your portrait is shown in the command HUD and national briefing screens. You can change it later."/></p>}<div className="wizard-save-tools">{step===1&&onReturnToMenu&&<button onClick={onReturnToMenu}><LocaleText value="Return to sign in"/></button>}{step===1&&<button className="load-previous" onClick={()=>void load()}><LocaleText value="Load previous progress"/></button>}{step===1&&saveMessage&&<small role="status"><LocaleText value={saveMessage}/></small>}</div><div className="wizard-navigation"><button className="wizard-back" disabled={step===1} onClick={()=>setStep(s=>typeof s==='number'&&s>1?(s-1) as SetupStep:s)}><LocaleText value={tr(language,'back','BACK')}/></button><span><LocaleText value={"STEP "}/><LocaleText value={step}/><LocaleText value={" / 4"}/></span>{step!==4?<button className="wizard-next" disabled={step===1&&(!name.trim()||Boolean(birthDate&&!validBirthDate(birthDate)))} onClick={()=>setStep(s=>typeof s==='number'&&s<4?(s+1) as SetupStep:s)}><LocaleText value={tr(language,'continue','CONTINUE')}/></button>:<button className="wizard-next confirm" onClick={()=>{setLoadingStep(0);setStep('loading')}}><LocaleText value={tr(language,'confirm_begin','CONFIRM & BEGIN')}/></button>}</div></footer>
  </section>
 </div>;
}
