import {UI_CATALOG_FLOW} from './uiCatalogFlow083';
import {UI_CATALOG_083} from './uiCatalog083';
import {UI_CATALOG_COMPLETE} from './uiCatalogComplete';
import {UI_CATALOG_POLISH,PLAIN_EN} from './uiCatalogPolish';
import {UI_CATALOG_082} from './uiCatalog082';
import { TECHNOLOGY_TREE } from "../data/technologyTree";
import { UI_CATALOG_081 } from "./uiCatalog081";
import { translateNews,NEWS_TEMPLATES } from "./newsTemplates";
import { UI_CATALOG_080 } from "./uiCatalog080";
import { UI_CATALOG_079 } from "./uiCatalog079";
import { UI_CATALOG_078 } from "./uiCatalog078";
import { type ReactNode, Fragment } from "react";
import { UI_CATALOG } from "./uiCatalog";
import { D } from "./gameI18n";
import { WORLD_COUNTRY_SEEDS } from "../data/worldCountryCatalog";
import { useGameStore } from "../store/gameStore";

const languages = ["tr", "es", "zh", "ru"];
const catalogKey=(text:string)=>text.trim().replace(/\s+/g," ").toLowerCase().replaceAll("_"," ");
const templates = new Map<string, {pattern:RegExp;value:string;slots:number[]}[]>();
const catalogs = new Map<string, Map<string, string>>();
catalogs.set('en',new Map(Object.entries(PLAIN_EN).map(([key,value])=>[key.toLowerCase(),value])));
for (const language of languages) {
  const index = languages.indexOf(language),
    entries = new Map<string, string>();
  for (const catalog of [
    UI_CATALOG,
    UI_CATALOG_078,
    UI_CATALOG_079,
    UI_CATALOG_080,
    UI_CATALOG_081,
    UI_CATALOG_082,
    UI_CATALOG_083,
    Object.fromEntries(Object.entries(NEWS_TEMPLATES).map(([key,tr])=>[key,[tr,key,key,key]])),
    UI_CATALOG_COMPLETE,
  ]) {
    for (const [key, values] of Object.entries(catalog)) {
      const normalized = catalogKey(key), previous = entries.get(normalized);
      if (!values[index]) continue;
      // Completion fills gaps; reviewed overrides below may replace existing wording.
      if (catalog === UI_CATALOG_COMPLETE && previous && catalogKey(previous) !== normalized) continue;
      if (values[index] === key && previous) continue;
      entries.set(normalized, values[index].trim());
    }
  }
  for (const [key, value] of Object.entries(D.en))
    if (D[language as keyof typeof D]?.[key])
      entries.set(value.toLowerCase(), D[language as keyof typeof D][key]);
  for(const [key,values] of Object.entries({...UI_CATALOG_POLISH,...UI_CATALOG_FLOW}))
    entries.set(key.trim().toLowerCase().replaceAll("_", " "),values[index]);
  const countries = new Intl.DisplayNames([language], { type: "region" });
  for (const c of WORLD_COUNTRY_SEEDS)
    entries.set(c.name.toLowerCase(), countries.of(c.iso2) ?? c.name);
  for (const node of TECHNOLOGY_TREE)
    entries.set(node.id, entries.get(node.name.toLowerCase()) ?? node.name);
  catalogs.set(language, entries);
  templates.set(language,[...entries].filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>{
    const slots:number[]=[];
    const pattern=new RegExp('^'+key.split(/(\{\d+\})/).map(p=>{if(/^\{\d+\}$/.test(p)){slots.push(Number(p.slice(1,-1)));return '([\\s\\S]+?)';}return p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('')+'$','i');
    return {pattern,value,slots};
  }));
}
export function translateText(
  language: string,
  text: string,
  depth = 0,
): string {
  const entries = catalogs.get(language);
  if (!entries || !text.trim()) return text;
  const clean = text.trim().replace(/\s+/g, " "),
    lower = clean.toLowerCase().replaceAll("_", " "),
    exact = entries.get(lower);
  if (exact) {
    const result =
      clean === clean.toUpperCase() && /[A-Z]/.test(clean)
        ? exact.toLocaleUpperCase(language)
        : exact;
    return text.replace(text.trim(), result);
  }
  if(depth<3)for(const row of templates.get(language)??[]){
    const match=clean.match(row.pattern);if(!match)continue;
    const slots=new Map(row.slots.map((slot,i)=>[slot,match[i+1]]));
    return row.value.replace(/\{(\d+)\}/g,(_,n)=>translateText(language,slots.get(Number(n))??'',depth+1));
  }
  if (language === "tr" && depth < 3 && /[A-Za-z]{3}/.test(clean)) {
    const news = translateNews(clean, (value) =>
      translateText(language, value, depth + 1),
    );
    if (news) return text.replace(text.trim(), news);
  }
  // Translate composed labels while preserving numbers, names and punctuation.
  const parts = text.split(/(\s*[·|↔→,]\s*|\s*\/\s*|\s+\+\s+)/);
  if (parts.length > 1)
    return parts
      .map((part, i) => (i % 2 ? part : translatePart(part, entries)))
      .join("");
  return translatePart(text, entries);
}
function translatePart(text: string, entries: Map<string, string>): string {
  const exact = entries.get(text.trim().toLowerCase().replaceAll("_", " "));
  if (exact) return text.replace(text.trim(), exact);
  const match = text.match(/^(.*?)(\s+[+-]?\d[\s\S]*|:\s*[\s\S]*)$/);
  if (match) {
    const prefix = entries.get(match[1].toLowerCase().replaceAll("_", " "));
    if (prefix) return prefix + match[2];
  }
  const tail = text.match(/^(.*?\d[\d.,%+$B\s]*)\s+([A-Za-z][A-Za-z _-]*)$/);
  if (tail) {
    const translated = entries.get(tail[2].toLowerCase().replaceAll("_", " "));
    if (translated) return tail[1] + " " + translated;
  }
  return text;
}
export const translateLive = (text: string) =>
  translateText(useGameStore.getState().playerProfile.language, text);
export function formatText(language:string,key:string,values:string[]):string {
 return translateText(language,key).replace(/\{(\d+)\}/g,(_,n)=>translateText(language,values[Number(n)]??''));
}
export const formatLive=(key:string,values:string[])=>formatText(useGameStore.getState().playerProfile.language,key,values);
export function LocaleText({ value }: { value: ReactNode }) {
  const language = useGameStore((s) => s.playerProfile.language);
  const walk = (v: ReactNode): ReactNode =>
    typeof v === "string"
      ? translateText(language, v)
      : Array.isArray(v)
        ? v.map((child, i) => <Fragment key={i}>{walk(child)}</Fragment>)
        : v;
  return <>{walk(value)}</>;
}
