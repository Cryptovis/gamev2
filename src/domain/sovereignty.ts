import type {CountryState} from './game';
export const activeCountries=(countries:Record<string,CountryState>)=>Object.values(countries).filter(c=>!c.annexedBy);
export function sovereignId(countries:Record<string,CountryState>,id:string){const seen=new Set<string>();while(countries[id]?.annexedBy&&!seen.has(id)){seen.add(id);id=countries[id].annexedBy!;}return id;}
