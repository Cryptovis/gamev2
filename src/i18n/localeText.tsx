import {UI_CATALOG_094} from './uiCatalog094';
import {UI_CATALOG_SPRINT3} from './uiCatalogSprint3';
import {UI_CATALOG_PHASE7} from './uiCatalogPhase7';
import {UI_CATALOG_0917} from './uiCatalog0917';
import {UI_CATALOG_0918} from './uiCatalog0918';
import {UI_CATALOG_0919} from './uiCatalog0919';
import {UI_CATALOG_0920} from './uiCatalog0920';
import {UI_CATALOG_0916} from './uiCatalog0916';
import {UI_CATALOG_0915} from './uiCatalog0915';
import {UI_CATALOG_0914} from './uiCatalog0914';
import {UI_CATALOG_0913} from './uiCatalog0913';
import {UI_CATALOG_0912} from './uiCatalog0912';
import {UI_CATALOG_0910,LEGACY_BRAND_EN} from './uiCatalog0910';
import {UI_CATALOG_0908} from './uiCatalog0908';
import {UI_CATALOG_0907} from './uiCatalog0907';
import {UI_CATALOG_0905} from './uiCatalog0905';
import {UI_CATALOG_0904} from './uiCatalog0904';
import {UI_CATALOG_0903} from './uiCatalog0903';
import {UI_CATALOG_090} from './uiCatalog090';
import {UI_CATALOG_089_M} from './uiCatalog089M';
import {UI_CATALOG_089_L} from './uiCatalog089L';
import {UI_CATALOG_FLOW} from './uiCatalogFlow083';
import {UI_CATALOG_087_A} from './uiCatalog087A';
import {UI_CATALOG_087_B} from './uiCatalog087B';
import {UI_CATALOG_087_C} from './uiCatalog087C';
import {UI_CATALOG_088_D} from './uiCatalog088D';
import {UI_CATALOG_088_E} from './uiCatalog088E';
import {UI_CATALOG_088_F} from './uiCatalog088F';
import {UI_CATALOG_089_G} from './uiCatalog089G';
import {UI_CATALOG_089_H} from './uiCatalog089H';
import {UI_CATALOG_089_I} from './uiCatalog089I';
import {UI_CATALOG_089_K} from './uiCatalog089K';
import {UI_CATALOG_089_J} from './uiCatalog089J';
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
catalogs.set('en',new Map([...Object.entries({...PLAIN_EN,...LEGACY_BRAND_EN}).map(([key,value])=>[key.toLowerCase(),value] as [string,string]),['national power','Power'],['turkey','Türkiye'],['turkiye','Türkiye'],['macedonia','North Macedonia']]));
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
  for(const [key,values] of Object.entries({...UI_CATALOG_POLISH,...UI_CATALOG_FLOW,...UI_CATALOG_087_A,...UI_CATALOG_087_B,...UI_CATALOG_087_C}))
    entries.set(key.trim().toLowerCase().replaceAll("_", " "),values[index]);
  // 0.88 catalogs only fill missing keys, so reviewed translations of shared words (e.g. "Approval") are kept.
  for(const [key,values] of Object.entries({...UI_CATALOG_088_D,...UI_CATALOG_088_E,...UI_CATALOG_088_F,...UI_CATALOG_089_G,...UI_CATALOG_089_H,...UI_CATALOG_089_I})){const k=key.trim().toLowerCase().replaceAll("_"," ");if(!entries.has(k)&&values[index])entries.set(k,values[index]);}
  // Reviewed supply/war wording also replaces old machine-translated contract notices.
  for(const [key,values] of Object.entries(UI_CATALOG_089_J))entries.set(catalogKey(key),values[index]);
  for(const [key,values] of Object.entries(UI_CATALOG_089_K))entries.set(catalogKey(key),values[index]);
  for(const [key,values] of Object.entries(UI_CATALOG_089_L))entries.set(catalogKey(key),values[index]);
  for(const [key,values] of Object.entries(UI_CATALOG_089_M))entries.set(catalogKey(key),values[index]);
  for(const [key,values] of Object.entries({...UI_CATALOG_090,...UI_CATALOG_0903,...UI_CATALOG_0904,...UI_CATALOG_0905,...UI_CATALOG_0907,...UI_CATALOG_0908,...UI_CATALOG_0910,...UI_CATALOG_0912,...UI_CATALOG_0913,...UI_CATALOG_0914,...UI_CATALOG_0915,...UI_CATALOG_0916,...UI_CATALOG_0917,...UI_CATALOG_0918,...UI_CATALOG_0919,...UI_CATALOG_0920,...UI_CATALOG_PHASE7,...UI_CATALOG_SPRINT3,...UI_CATALOG_094}))entries.set(catalogKey(key),values[index]);
  const countries = new Intl.DisplayNames([language], { type: "region" });
  for (const c of WORLD_COUNTRY_SEEDS)
    entries.set(c.name.toLowerCase(), countries.of(c.iso2) ?? c.name);
  for(const key of ['turkey','turkiye','türkiye'])entries.set(key,['Türkiye','Türkiye','土耳其','Турция'][index]);
  for(const key of ['macedonia','north macedonia'])entries.set(key,['Kuzey Makedonya','Macedonia del Norte','北马其顿','Северная Македония'][index]);
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
