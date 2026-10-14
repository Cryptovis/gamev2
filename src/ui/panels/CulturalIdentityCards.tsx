import {formatCulturalIdentity} from '../../presentation/culturalIdentityLabel';
import {useGameStore} from '../../store/gameStore';
import type {CountryState} from '../../domain/game';
import {ReligionGlyph,SocietyIcon,WorldIcon} from '../icons/GameIcons';
import {LocaleText} from '../../i18n/localeText';
export function CulturalIdentityCards({country}:{country:CountryState}){
 const language=useGameStore(s=>s.playerProfile.language);
 const religion=country.society?.dominantReligion,ideology=country.society?.ideology;
 return <div className="cultural-identity-cards">
  {[{label:'RELIGION',value:religion,icon:<ReligionGlyph religion={religion??'secular'} size={32}/>},{label:'IDEOLOGY',value:ideology,icon:<SocietyIcon size={32}/>},{label:'REGION',value:country.region,icon:<WorldIcon size={32}/>}].map(card=><article key={card.label}>{card.icon}<small><LocaleText value={card.label}/></small><strong>{formatCulturalIdentity(card.value,language)}</strong></article>)}
 </div>;
}
