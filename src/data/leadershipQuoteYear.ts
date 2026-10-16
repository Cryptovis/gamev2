import type {GameLanguage} from '../domain/game';

// Quote years are stored once, in a neutral English form ("c. 5th century BCE", "431 BCE", "1863"), and written for
// display here, so no language shows English era words. Anything that does not match a known shape is shown as stored.

const ROMAN=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];

interface Parsed {circa:boolean;bce:boolean;from:number;to?:number;century:boolean;}
function parse(year:string):Parsed|null {
  const century=/^(c\. )?(\d{1,2})(?:st|nd|rd|th) century( BCE)?$/.exec(year);
  if(century)return {circa:!!century[1],bce:!!century[3],from:Number(century[2]),century:true};
  const plain=/^(c\. )?(\d{1,4})(?:–(\d{1,4}))?( BCE)?$/.exec(year);
  if(plain)return {circa:!!plain[1],bce:!!plain[4],from:Number(plain[2]),to:plain[3]?Number(plain[3]):undefined,century:false};
  return null;
}

const FORMATTERS:Record<GameLanguage,(p:Parsed)=>string>={
  en:p=>`${p.circa?'c. ':''}${p.century?`${p.from}${ordinalSuffix(p.from)} century`:range(p)}${p.bce?' BCE':''}`,
  tr:p=>`${p.circa?(p.bce?'yaklaşık ':''):''}${p.bce?'M.Ö. ':''}${p.century?`${p.from}. yüzyıl`:range(p)}${p.circa&&!p.bce?' civarı':''}`,
  es:p=>`${p.circa?'c. ':''}${p.century?`siglo ${ROMAN[p.from]??p.from}`:range(p)}${p.bce?' a. C.':''}`,
  zh:p=>`${p.circa?'约':''}${p.bce?'公元前':''}${p.century?`${p.from}世纪`:`${range(p)}年`}`,
  ru:p=>`${p.circa?'ок. ':''}${p.century?`${ROMAN[p.from]??p.from} в.`:`${range(p)} ${p.to?'гг.':'г.'}`}${p.bce?' до н. э.':''}`,
};
const range=(p:Parsed)=>p.to?`${p.from}–${p.to}`:`${p.from}`;
const ordinalSuffix=(n:number)=>n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'} as Record<number,string>)[n%10]??'th';

/** The year of a quote as it should read in the given language. */
export function formatQuoteYear(year:string,language:GameLanguage):string {
  if(language==='en')return year;
  const parsed=parse(year);
  return parsed?FORMATTERS[language](parsed):year;
}
