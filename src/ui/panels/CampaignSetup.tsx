import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { GameLanguage } from '../../domain/game';
import { AVATAR_PRESETS } from '../../data/avatarPresets';
import { countryThemeFor, flagEmoji } from '../../data/countryThemes';
import { LANGUAGE_OPTIONS, tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';

type SetupStep=1|2|3|4|'loading';

function countryDifficulty(capability:number,gdp:number){
 const power=capability+Math.min(100,gdp/18);
 if(power>=135)return 'MAJOR POWER';
 if(power>=90)return 'REGIONAL POWER';
 if(power>=55)return 'BALANCED';
 return 'CHALLENGING';
}

export function CampaignSetup(){
 const profile=useGameStore(s=>s.playerProfile);
 const countries=useGameStore(s=>s.countries);
 const start=useGameStore(s=>s.startCampaign);
 const [step,setStep]=useState<SetupStep>(1);
 const [language,setLanguage]=useState<GameLanguage>(profile.language);
 const [name,setName]=useState(profile.commanderName==='Commander'?'':profile.commanderName);
 const [avatar,setAvatar]=useState(profile.avatarId);
 const [countryId,setCountryId]=useState('TUR');
 const [query,setQuery]=useState('');
 const [loadingStep,setLoadingStep]=useState(0);

 const list=useMemo(()=>Object.values(countries).filter(c=>c.name.toLowerCase().includes(query.toLowerCase())||c.iso2.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)),[countries,query]);
 const selected=countries[countryId]??countries.TUR;
 const theme=countryThemeFor(selected.iso2);
 const topResources=useMemo(()=>Object.entries(selected.resourceProduction).sort((a,b)=>b[1]-a[1]).slice(0,2),[selected]);

 useEffect(()=>{
  if(step!=='loading')return;
  const timers=[
   window.setTimeout(()=>setLoadingStep(1),450),
   window.setTimeout(()=>setLoadingStep(2),1150),
   window.setTimeout(()=>setLoadingStep(3),1900),
   window.setTimeout(()=>setLoadingStep(4),2600),
   window.setTimeout(()=>start({commanderName:name,countryId:selected.id,avatarId:avatar,language}),3350),
  ];
  return ()=>timers.forEach(window.clearTimeout);
 },[step,start,name,selected.id,avatar,language]);

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
   <div className="loading-identity"><AvatarPortrait id={avatar} size={124}/><div className="loading-flag">{flagEmoji(selected.iso2)}</div></div>
   <small>ALPYX // COMMAND TRANSFER</small>
   <h1>{name.trim()}'s first day in office begins.</h1>
   <p>{selected.name} is transferring executive command. Markets are opening, diplomats are waiting, and the cabinet is assembling for the first briefing.</p>
   <div className="loading-status"><span>{loadingMessages[Math.max(0,loadingStep-1)]??tr(language,'loading_1','Establishing national command…')}</span><strong>{[8,28,54,78,100][loadingStep]}%</strong></div>
   <div className="loading-track"><i style={{width:`${[8,28,54,78,100][loadingStep]}%`}}/></div>
   <div className="loading-checks">{loadingMessages.map((message,i)=><div key={message} className={loadingStep>i?'done':''}><b>{loadingStep>i?'✓':'○'}</b><span>{message}</span></div>)}</div>
  </section>
 </div>;

 const stepTitle=step===1?tr(language,'step_name','Your identity'):step===2?tr(language,'step_portrait','Choose your portrait'):step===3?tr(language,'step_country','Choose your nation'):tr(language,'step_confirm','Confirm command');

 return <div className="campaign-setup-backdrop campaign-wizard-backdrop" style={{'--setup-primary':theme.primary,'--setup-accent':theme.accent} as CSSProperties}>
  <section className="campaign-wizard">
   <header className="wizard-header"><div><small>ALPYX // GLOBAL COMMAND</small><h1>{stepTitle}</h1><p>{tr(language,'setup_sub')}</p></div><div className="wizard-stepper">{[1,2,3,4].map(n=><span key={n} className={typeof step==='number'&&step>=n?'active':''}><b>{n}</b><small>{n===1?'IDENTITY':n===2?'PORTRAIT':n===3?'NATION':'CONFIRM'}</small></span>)}</div></header>

   <div className="wizard-body">
    {step===1&&<div className="wizard-single-column">
      <div className="wizard-intro"><span className="wizard-kicker">STEP 01 / LEADER IDENTITY</span><h2>Every era begins with a leader.</h2><p>Choose the name that will appear in national briefings, diplomatic reports and your command profile.</p></div>
      <label className="wizard-name-field"><span>{tr(language,'commander')}</span><input autoFocus value={name} maxLength={28} placeholder="Commander" onChange={e=>setName(e.target.value)}/></label>
      <div className="wizard-language"><span>{tr(language,'language')}</span><div>{LANGUAGE_OPTIONS.map(l=><button key={l.id} className={language===l.id?'active':''} onClick={()=>setLanguage(l.id)}>{l.label}</button>)}</div></div>
    </div>}

    {step===2&&<div className="wizard-portrait-stage">
      <div className="wizard-intro compact"><span className="wizard-kicker">STEP 02 / COMMAND PROFILE</span><h2>{tr(language,'choose_avatar')}</h2><p>Your portrait is shown in the command HUD and national briefing screens. You can change it later.</p></div>
      <div className="wizard-avatar-layout"><div className="wizard-avatar-grid">{AVATAR_PRESETS.map(a=><button key={a.id} className={avatar===a.id?'active':''} onClick={()=>setAvatar(a.id)}><AvatarPortrait id={a.id} size={72}/><span>{a.label}</span></button>)}</div><aside className="wizard-avatar-preview"><AvatarPortrait id={avatar} size={152}/><small>COMMANDER</small><strong>{name||'Commander'}</strong><span>{AVATAR_PRESETS.find(a=>a.id===avatar)?.label}</span></aside></div>
    </div>}

    {step===3&&<div className="wizard-country-stage">
      <div className="wizard-country-list"><div className="wizard-intro compact"><span className="wizard-kicker">STEP 03 / SOVEREIGN COMMAND</span><h2>{tr(language,'country')}</h2></div><input className="country-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr(language,'search_country')}/><div className="country-choice-list wizard-country-scroll">{list.map(c=><button key={c.id} className={countryId===c.id?'active':''} onClick={()=>setCountryId(c.id)}><b>{flagEmoji(c.iso2)}</b><span><strong>{c.name}</strong><small>{c.region} · {c.politics.regime}</small></span><em>{c.military.assessment.capability.toFixed(0)}</em></button>)}</div></div>
      <aside className="wizard-country-preview"><div className="nation-flag-hero">{flagEmoji(selected.iso2)}</div><small>{selected.region.toUpperCase()}</small><h2>{selected.name}</h2><strong className="difficulty-chip">{countryDifficulty(selected.military.assessment.capability,selected.economy.gdp)}</strong><div className="wizard-stat-grid"><span><small>GDP</small><b>${selected.economy.gdp.toFixed(0)}B</b></span><span><small>POPULATION</small><b>{(selected.demographics.population/1e6).toFixed(1)}M</b></span><span><small>MILITARY</small><b>{selected.military.assessment.capability.toFixed(0)}</b></span><span><small>STABILITY</small><b>{selected.politics.stability.toFixed(0)}%</b></span></div><div className="opening-profile"><small>OPENING PROFILE</small><p>{selected.politics.regime.replaceAll('_',' ')} · {selected.society.ideology.replaceAll('_',' ')} · {selected.society.dominantReligion.replaceAll('_',' ')}</p><p>Strongest production: {topResources.map(([r,v])=>`${r.toUpperCase()} ${Number(v).toFixed(1)}`).join(' · ')}</p></div></aside>
    </div>}

    {step===4&&<div className="wizard-confirm-stage">
      <div className="confirm-leader-card"><div className="confirm-banner" style={{background:`linear-gradient(135deg,${theme.primary},${theme.accent})`}}/><div className="confirm-avatar"><AvatarPortrait id={avatar} size={138}/><span>{flagEmoji(selected.iso2)}</span></div><small>NATIONAL COMMAND NOMINATION</small><h2>{name}</h2><strong>{selected.name}</strong><p>{selected.politics.regime.replaceAll('_',' ')} · {selected.region} · {selected.society.ideology.replaceAll('_',' ')}</p></div>
      <div className="confirm-brief"><span className="wizard-kicker">STEP 04 / FINAL REVIEW</span><h2>{tr(language,'review_title','Ready to assume command?')}</h2><p>Once confirmed, national systems, diplomacy, markets, intelligence and military command will initialize around this profile.</p><div className="confirm-summary-grid"><span><small>COMMANDER</small><strong>{name}</strong></span><span><small>LANGUAGE</small><strong>{LANGUAGE_OPTIONS.find(x=>x.id===language)?.label}</strong></span><span><small>NATION</small><strong>{flagEmoji(selected.iso2)} {selected.name}</strong></span><span><small>STARTING TREASURY</small><strong>${selected.economy.treasury.toFixed(1)}B</strong></span><span><small>GDP</small><strong>${selected.economy.gdp.toFixed(0)}B</strong></span><span><small>MILITARY CAPABILITY</small><strong>{selected.military.assessment.capability.toFixed(1)}</strong></span></div><div className="confirm-message">“Your first briefing is ready. The world will begin reacting the moment you take office.”</div></div>
    </div>}
   </div>

   <footer className="wizard-footer"><button className="wizard-back" disabled={step===1} onClick={()=>setStep(s=>typeof s==='number'&&s>1?(s-1) as SetupStep:s)}>{tr(language,'back','BACK')}</button><span>STEP {step} / 4</span>{step!==4?<button className="wizard-next" disabled={step===1&&!name.trim()} onClick={()=>setStep(s=>typeof s==='number'&&s<4?(s+1) as SetupStep:s)}>{tr(language,'continue','CONTINUE')}</button>:<button className="wizard-next confirm" onClick={()=>{setLoadingStep(0);setStep('loading')}}>{tr(language,'confirm_begin','CONFIRM & BEGIN')}</button>}</footer>
  </section>
 </div>;
}
