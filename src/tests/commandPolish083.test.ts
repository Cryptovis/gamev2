import {describe,it,expect} from 'vitest';
import {translateText,formatText} from '../i18n/localeText';
import {UI_CATALOG_POLISH} from '../i18n/uiCatalogPolish';
import {UI_CATALOG_COMPLETE} from '../i18n/uiCatalogComplete';
import {NEWS_TEMPLATES} from '../i18n/newsTemplates';
import {reviewVisualKind} from '../ui/icons/ReviewVisual';
describe('0.83 shared translation and result flows',()=>{
 it.each(['tr','es','zh','ru'])('%s translates every reviewed label and preserves contract values',language=>{
  for(const key of Object.keys(UI_CATALOG_POLISH))expect(translateText(language,key),key).not.toBe(key);
  const title=formatText(language,'{0}-year {1} contract',['10','oil']);expect(title).toContain('10');expect(title).not.toMatch(/\{\d+\}|-year|oil contract/);
  const report=translateText(language,'TRADE // 10-year oil contract signed with Azerbaijan; monthly delivery, locked unit price $0.100.');
  expect(report).toContain('10');expect(report).toContain('0.100');expect(report).not.toContain('contract signed with');
  expect(translateText(language,'Approval +3, stability +2')).not.toMatch(/approval|stability/i);
 });
 it('contains no model token markers or repeated-word output',()=>{
  for(const [key,values] of Object.entries(UI_CATALOG_COMPLETE))for(const value of values){expect(value,key).not.toContain('▁');expect(value,key).not.toMatch(/\b(\w+)(?:\s+\1){3,}\b/i);}
 });
 it('preserves all placeholders in completed localization rows',()=>{
  const slots=(s:string)=>[...s.matchAll(/\{(\d+)\}/g)].map(x=>x[1]).sort();
  for(const [key,values] of Object.entries(UI_CATALOG_COMPLETE))for(const value of values)expect(slots(value),key+' => '+value).toEqual(slots(key));
 });
 it.each(['es','zh','ru'])('%s localizes all retained news templates',language=>{
  for(const key of Object.keys(NEWS_TEMPLATES)){
   const text=key.replace(/\{(\d+)\}/g,(_,n)=>String(100+Number(n)));
   expect(translateText(language,text),key).not.toBe(text);
  }
 });
 it('chooses artwork by the action subject and keeps contract receipts identifiable',()=>{
  expect(reviewVisualKind('Supply contract signed')).toBe('contract');expect(reviewVisualKind('Proposal sent')).toBe('diplomacy');expect(reviewVisualKind('Review lending')).toBe('economy');expect(reviewVisualKind('Commit combat orders')).toBe('military');
 });
});
