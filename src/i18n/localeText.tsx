import {UI_CATALOG_080} from './uiCatalog080';
import {UI_CATALOG_079} from './uiCatalog079';
import {UI_CATALOG_078} from './uiCatalog078';
import { type ReactNode, Fragment } from "react";
import { UI_CATALOG } from "./uiCatalog";
import { D } from "./gameI18n";
import { WORLD_COUNTRY_SEEDS } from "../data/worldCountryCatalog";
import { useGameStore } from "../store/gameStore";

const languages = ["tr", "es", "zh", "ru"];
const catalogs = new Map<string, Map<string, string>>();
for (const language of languages) {
  const index = languages.indexOf(language),
    entries = new Map<string, string>();
  for (const [key, values] of Object.entries({...UI_CATALOG,...UI_CATALOG_078,...UI_CATALOG_079,...UI_CATALOG_080}))
    entries.set(key.toLowerCase().replaceAll("_", " "), values[index]);
  for (const [key, value] of Object.entries(D.en))
    if (D[language as keyof typeof D]?.[key])
      entries.set(value.toLowerCase(), D[language as keyof typeof D][key]);
  const countries = new Intl.DisplayNames([language], { type: "region" });
  for (const c of WORLD_COUNTRY_SEEDS)
    entries.set(c.name.toLowerCase(), countries.of(c.iso2) ?? c.name);
  catalogs.set(language, entries);
}
export function translateText(language: string, text: string): string {
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
  // Translate composed labels while preserving numbers, names and punctuation.
  const parts = text.split(/(\s*[·|↔→]\s*|\s*\/\s*)/);
  if (parts.length > 1)
    return parts
      .map((part, i) => (i % 2 ? part : translatePart(part, entries)))
      .join("");
  return translatePart(text, entries);
}
function translatePart(text: string, entries: Map<string, string>): string {
  const exact = entries.get(text.trim().toLowerCase().replaceAll("_", " "));
  if (exact) return text.replace(text.trim(), exact);
  const match = text.match(/^(.*?)(\s+\d[\s\S]*|:\s*[\s\S]*)$/);
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
