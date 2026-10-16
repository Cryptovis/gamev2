import {useAppearance,type AppearancePreference} from '../../presentation/appearance';
import {LocaleText,translateLive} from '../../i18n/localeText';
export function AppearanceOptions(){
 const preference=useAppearance(s=>s.preference),setPreference=useAppearance(s=>s.setPreference);
 return <fieldset className="appearance-options"><legend><LocaleText value="Appearance"/></legend>
  <div role="group" aria-label={translateLive('Appearance')}>
   {(['dark','light','system'] as AppearancePreference[]).map(value=><button type="button" key={value} data-appearance={value} aria-pressed={preference===value} onClick={()=>setPreference(value)}><LocaleText value={value==='dark'?'Dark':value==='light'?'Light':'System'}/></button>)}
  </div>{preference==='system'&&<small data-testid="appearance-system-note"><LocaleText value="System follows your device appearance."/></small>}
 </fieldset>;
}
