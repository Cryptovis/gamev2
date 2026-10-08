import tr from './completedLocales/tr.json';
import es from './completedLocales/es.json';
import zh from './completedLocales/zh.json';
import ru from './completedLocales/ru.json';
// Static authoring translations: no network requests or model in the game.
const dictionaries:Record<string,string>[]=[tr,es,zh,ru];
export const UI_CATALOG_COMPLETE:Record<string,string[]>=Object.fromEntries(
 [...new Set(dictionaries.flatMap(d=>Object.keys(d)))].map(key=>[key,dictionaries.map(d=>d[key]??key)]),
);
