import type {CountryState} from '../domain/game';
const cache=new WeakMap<CountryState,CountryState>();
/** ID-scoped presentation compatibility. Never write the projected object to a save or command. */
export function displayCountry(country:CountryState):CountryState{
 if(country.id!=='CYP'||country.name==='Cyprus'&&country.iso2==='CY')return country;
 let view=cache.get(country);if(!view){view={...country,name:'Cyprus',iso2:'CY'};cache.set(country,view);}return view;
}
const sets=new WeakMap<Record<string,CountryState>,Record<string,CountryState>>();
export function displayCountries(countries:Record<string,CountryState>){
 if(!countries.CYP||displayCountry(countries.CYP)===countries.CYP)return countries;
 let view=sets.get(countries);if(!view){view={...countries,CYP:displayCountry(countries.CYP)};sets.set(countries,view);}return view;
}
