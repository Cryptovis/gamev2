import {useEffect,useState} from 'react';
import {LocaleText} from '../../i18n/localeText';
import {useUiPrefsStore} from './uiPrefsStore';

/** Settings section for tactical hints. Preferences only: no game command, no save data. */
export function TacticalHintOptions(){
  const enabled=useUiPrefsStore(s=>s.hintsEnabled);
  const setHintsEnabled=useUiPrefsStore(s=>s.setHintsEnabled);
  const resetHints=useUiPrefsStore(s=>s.resetHints);
  const [restored,setRestored]=useState(false);
  useEffect(()=>{
    if(!restored)return;
    const timer=setTimeout(()=>setRestored(false),2500);
    return()=>clearTimeout(timer);
  },[restored]);
  return <fieldset className="appearance-options tactical-hint-options" data-testid="tactical-hint-options">
    <legend><LocaleText value="Tactical hints"/></legend>
    <label className="tactical-hint-toggle"><input type="checkbox" checked={enabled} onChange={event=>setHintsEnabled(event.target.checked)}/><span><LocaleText value="Show tactical hints"/></span></label>
    <small><LocaleText value="Short explanations appear behind a ? beacon in window headers."/></small>
    <button type="button" className="change-portrait-button" onClick={()=>{resetHints();setRestored(true);}}><LocaleText value="Reset dismissed hints"/></button>
    <small className="tactical-hint-confirmation" role="status" aria-live="polite">{restored&&<LocaleText value="Dismissed hints restored."/>}</small>
  </fieldset>;
}
