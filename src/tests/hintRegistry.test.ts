import {describe,expect,it} from 'vitest';
import {ALL_HINTS} from '../ui/hints/registry';
import {MERGED_CATALOG_GROUP,translateText} from '../i18n/localeText';

const LANGUAGES=['tr','es','zh','ru'] as const;
const keysOf=(hint:(typeof ALL_HINTS)[number])=>[hint.titleKey,hint.bodyKey,...(hint.extraKeys??[]),...(hint.learnMoreKey?[hint.learnMoreKey]:[])];

describe('hint registry',()=>{
  it('lists the five hub hints and the eleven migrated window hints',()=>{
    expect(ALL_HINTS.map(h=>h.id).sort()).toEqual([
      'credit.rules','desk.proposals','diplomacy.rules','intl.finance','intl.markets','intl.overview','intl.resolutions','intl.sanctions',
      'production.doctrine','rankings.diplomacy','rankings.financial','rankings.military','resources.shortage','supply.investment','war.taskGroups','war.tactical',
    ].sort());
  });
  it('has unique, namespaced ids',()=>{
    const ids=ALL_HINTS.map(h=>h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const id of ids)expect(id).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
  });
  it('resolves every title, body, extra and learn-more key to a non-English translation in tr, es, zh and ru',()=>{
    for(const hint of ALL_HINTS)for(const key of keysOf(hint))for(const language of LANGUAGES){
      const translated=translateText(language,key);
      expect(translated.trim().length,`${hint.id} ${language}: ${key}`).toBeGreaterThan(0);
      expect(translated,`${hint.id} ${language}: ${key}`).not.toBe(key);
    }
  });
});

describe('footnote migration guard',()=>{
  const sources=import.meta.glob<string>('../ui/**/*.{ts,tsx}',{query:'?raw',import:'default',eager:true});
  const isHintFile=(path:string)=>path.startsWith('../ui/hints/')||path==='../ui/panels/international/hints.ts';
  const migrated=ALL_HINTS.filter(h=>!h.id.startsWith('intl.')).flatMap(h=>[h.bodyKey,...(h.extraKeys??[])]);
  it('keeps every migrated English body string out of the UI outside hint files',()=>{
    expect(migrated.length).toBeGreaterThanOrEqual(13);
    for(const [path,source] of Object.entries(sources)){
      if(isHintFile(path))continue;
      for(const text of migrated)expect(source.includes(text),`${path} still contains: ${text}`).toBe(false);
    }
  });
  it('no longer renders the retired *-note elements or the duplicate hardware-transfer note',()=>{
    const retired=['tactical-note','diplomacy-rule-note','supply-investment-note','desk-footnote','production-doctrine-note','resource-command-note',
      'Transfers move existing reserve equipment. Alliance, trade access and embargo checks apply.'];
    for(const [path,source] of Object.entries(sources)){
      if(isHintFile(path))continue;
      for(const text of retired)expect(source.includes(text),`${path}: ${text}`).toBe(false);
    }
  });
});

describe('merged catalog group',()=>{
  // Pre-existing deliberate overrides, kept to the exact normalized keys so any new shadowing fails.
  const ALLOWED=new Set(['commodity','review repayment','sound and effects']);
  const normalize=(text:string)=>text.trim().replace(/\s+/g,' ').toLowerCase().replaceAll('_',' ');
  it('has no key defined differently by two catalogs (a later catalog silently shadowing an earlier one)',()=>{
    const seen=new Map<string,string>();const conflicts:string[]=[];
    for(const catalog of MERGED_CATALOG_GROUP)for(const [key,row] of Object.entries(catalog)){
      const k=normalize(key),signature=JSON.stringify(row),previous=seen.get(k);
      if(previous!==undefined&&previous!==signature&&!ALLOWED.has(k))conflicts.push(k);
      seen.set(k,signature);
    }
    expect(conflicts).toEqual([]);
  });
});
