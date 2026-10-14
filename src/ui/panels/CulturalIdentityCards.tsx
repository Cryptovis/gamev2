import type {CountryState} from '../../domain/game';
import {ReligionGlyph,SocietyIcon,WorldIcon} from '../icons/GameIcons';
import {LocaleText} from '../../i18n/localeText';
export function CulturalIdentityCards({country}:{country:CountryState}){
 const religion=country.society?.dominantReligion,ideology=country.society?.ideology;
 return <div className="cultural-identity-cards">
  {[{label:'RELIGION',value:religion,icon:<ReligionGlyph religion={religion??'secular'}/>},{label:'IDEOLOGY',value:ideology,icon:<SocietyIcon/>},{label:'REGION',value:country.region,icon:<WorldIcon/>}].map(card=><article key={card.label}>{card.icon}<small><LocaleText value={card.label}/></small><strong><LocaleText value={card.value?card.value.replaceAll('_',' '):'Unknown'}/></strong></article>)}
 </div>;
}
