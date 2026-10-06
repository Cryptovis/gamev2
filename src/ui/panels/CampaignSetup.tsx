import { useMemo, useState } from 'react';
import type { GameLanguage } from '../../domain/game';
import { AVATAR_PRESETS } from '../../data/avatarPresets';
import { countryThemeFor, flagEmoji } from '../../data/countryThemes';
import { LANGUAGE_OPTIONS, tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';

export function CampaignSetup(){
 const profile=useGameStore(s=>s.playerProfile);
 const countries=useGameStore(s=>s.countries);
 const start=useGameStore(s=>s.startCampaign);
 const [language,setLanguage]=useState<GameLanguage>(profile.language);
 const [name,setName]=useState(profile.commanderName==='Commander'?'':profile.commanderName);
 const [avatar,setAvatar]=useState(profile.avatarId);
 const [countryId,setCountryId]=useState('TUR');
 const [query,setQuery]=useState('');
 const list=useMemo(()=>Object.values(countries).filter(c=>c.name.toLowerCase().includes(query.toLowerCase())||c.iso2.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)),[countries,query]);
 if(profile.setupComplete)return null;
 const selected=countries[countryId]??countries.TUR;
 const theme=countryThemeFor(selected.iso2);
 return <div className="campaign-setup-backdrop" style={{'--setup-primary':theme.primary,'--setup-accent':theme.accent} as React.CSSProperties}>
  <section className="campaign-setup">
   <header><div><small>ALPYX // GLOBAL COMMAND</small><h1>{tr(language,'setup_title')}</h1><p>{tr(language,'setup_sub')}</p></div><div className="setup-flag">{flagEmoji(selected.iso2)}</div></header>
   <div className="setup-grid">
    <div className="setup-column identity">
     <label>{tr(language,'commander')}<input value={name} maxLength={28} placeholder="Commander" onChange={e=>setName(e.target.value)}/></label>
     <div className="setup-section"><span>{tr(language,'language')}</span><div className="language-grid">{LANGUAGE_OPTIONS.map(l=><button key={l.id} className={language===l.id?'active':''} onClick={()=>setLanguage(l.id)}>{l.label}</button>)}</div></div>
     <div className="setup-section"><span>{tr(language,'avatar')}</span><div className="avatar-grid">{AVATAR_PRESETS.map(a=><button key={a.id} className={avatar===a.id?'active':''} onClick={()=>setAvatar(a.id)} title={a.label}><AvatarPortrait id={a.id} size={48}/></button>)}</div></div>
    </div>
    <div className="setup-column country">
     <div className="setup-section"><span>{tr(language,'country')}</span><input className="country-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr(language,'search_country')}/><div className="country-choice-list">{list.map(c=><button key={c.id} className={countryId===c.id?'active':''} onClick={()=>setCountryId(c.id)}><b>{flagEmoji(c.iso2)}</b><span><strong>{c.name}</strong><small>{c.region} · {c.iso2}</small></span><em>{c.military.assessment.capability.toFixed(0)}</em></button>)}</div></div>
    </div>
    <div className="setup-column preview">
     <div className="leader-preview"><AvatarPortrait id={avatar} size={112}/><small>{name.trim()||'Commander'}</small><h2>{selected.name}</h2><div className="preview-theme"><i style={{background:theme.primary}}/><i style={{background:theme.secondary}}/><i style={{background:theme.accent}}/></div></div>
     <div className="preview-stats"><span><small>GDP</small><strong>${selected.economy.gdp.toFixed(0)}B</strong></span><span><small>POP</small><strong>{(selected.demographics.population/1e6).toFixed(1)}M</strong></span><span><small>MIL</small><strong>{selected.military.assessment.capability.toFixed(0)}</strong></span><span><small>REGIME</small><strong>{selected.politics.regime.toUpperCase()}</strong></span></div>
     <button className="begin-campaign" disabled={!name.trim()} onClick={()=>start({commanderName:name,countryId:selected.id,avatarId:avatar,language})}>{tr(language,'begin')}</button>
    </div>
   </div>
  </section>
 </div>;
}
