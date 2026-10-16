import type {GameLanguage} from '../../domain/game';

/** Locale used for every date and relative time on the landing screen. */
export const LOCALE_BY_LANGUAGE:Record<GameLanguage,string>={en:'en-GB',tr:'tr-TR',es:'es-ES',zh:'zh-CN',ru:'ru-RU'};

/** "Day 45" in the language's own word order. Built in code so no template key has to be matched against every game string. */
export const DAY_LABEL:Record<GameLanguage,(day:number)=>string>={
  en:day=>`Day ${day}`,
  tr:day=>`${day}. gün`,
  es:day=>`Día ${day}`,
  zh:day=>`第 ${day} 天`,
  ru:day=>`День ${day}`,
};
export const formatDayLabel=(day:number,language:GameLanguage)=>DAY_LABEL[language](day);

/** Long calendar date for a YYYY-MM-DD campaign date, always read as UTC so the day never shifts with the time zone. */
export function formatCampaignDate(iso:string,language:GameLanguage):string {
  const date=new Date(`${iso}T00:00:00Z`);
  if(!Number.isFinite(date.getTime()))return iso;
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language],{dateStyle:'long',timeZone:'UTC'}).format(date);
}

const MINUTE=60_000,HOUR=60*MINUTE,DAY=24*HOUR;
/** "3 days ago" for the time a save was written, with the coarsest unit that is still exact enough. A save from the future counts as now. */
export function formatSavedAgo(savedAt:number,now:number,language:GameLanguage):string {
  const formatter=new Intl.RelativeTimeFormat(LOCALE_BY_LANGUAGE[language],{numeric:'auto'});
  const elapsed=Math.max(0,now-savedAt);
  if(elapsed<HOUR)return formatter.format(-Math.floor(elapsed/MINUTE),'minute');
  if(elapsed<DAY)return formatter.format(-Math.floor(elapsed/HOUR),'hour');
  if(elapsed<30*DAY)return formatter.format(-Math.floor(elapsed/DAY),'day');
  if(elapsed<365*DAY)return formatter.format(-Math.floor(elapsed/(30*DAY)),'month');
  return formatter.format(-Math.floor(elapsed/(365*DAY)),'year');
}
