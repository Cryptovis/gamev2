import {describe,it,expect} from 'vitest';
import {DAY_LABEL,LOCALE_BY_LANGUAGE,formatCampaignDate,formatDayLabel,formatSavedAgo} from '../ui/landing/saveCardFormat';
import type {GameLanguage} from '../domain/game';

const LANGUAGES:GameLanguage[]=['en','tr','es','zh','ru'];
const NOW=Date.UTC(2026,5,15,12,0,0);
const MIN=60_000,HOUR=60*MIN,DAY=24*HOUR;

describe('formatDayLabel',()=>{
 it('puts the number where each language wants it',()=>{
  expect(formatDayLabel(45,'en')).toBe('Day 45');
  expect(formatDayLabel(45,'tr')).toBe('45. gün');
  expect(formatDayLabel(45,'es')).toBe('Día 45');
  expect(formatDayLabel(45,'zh')).toBe('第 45 天');
  expect(formatDayLabel(45,'ru')).toBe('День 45');
 });
 it('has a label for every game language',()=>expect(Object.keys(DAY_LABEL).sort()).toEqual([...LANGUAGES].sort()));
});

describe('formatCampaignDate',()=>{
 it('writes the long date in the language, read as UTC',()=>{
  expect(formatCampaignDate('2026-03-01','en')).toBe('1 March 2026');
  expect(formatCampaignDate('2026-03-01','tr')).toBe('1 Mart 2026');
  expect(formatCampaignDate('2026-03-01','es')).toBe('1 de marzo de 2026');
  expect(formatCampaignDate('2026-03-01','zh')).toBe('2026年3月1日');
  expect(formatCampaignDate('2026-03-01','ru')).toBe('1 марта 2026 г.');
 });
 it('does not slip a day at the edges of the year',()=>{
  expect(formatCampaignDate('2026-01-01','en')).toBe('1 January 2026');
  expect(formatCampaignDate('2026-12-31','en')).toBe('31 December 2026');
 });
 it('returns the original text when it is not a date',()=>expect(formatCampaignDate('soon','en')).toBe('soon'));
 it('maps every language to a locale',()=>{for(const language of LANGUAGES)expect(LOCALE_BY_LANGUAGE[language].length,language).toBeGreaterThan(1);});
});

describe('formatSavedAgo',()=>{
 it('picks the unit that fits the age',()=>{
  expect(formatSavedAgo(NOW-5*MIN,NOW,'en')).toBe('5 minutes ago');
  expect(formatSavedAgo(NOW-3*HOUR,NOW,'en')).toBe('3 hours ago');
  expect(formatSavedAgo(NOW-2*DAY,NOW,'en')).toBe('2 days ago');
  expect(formatSavedAgo(NOW-60*DAY,NOW,'en')).toBe('2 months ago');
  expect(formatSavedAgo(NOW-800*DAY,NOW,'en')).toBe('2 years ago');
 });
 it('says yesterday and this minute instead of a number where the language has a word for it',()=>{
  expect(formatSavedAgo(NOW-DAY,NOW,'en')).toBe('yesterday');
  expect(formatSavedAgo(NOW-10_000,NOW,'en')).toBe('this minute');
 });
 it('treats a save time in the future as now',()=>expect(formatSavedAgo(NOW+HOUR,NOW,'en')).toBe('this minute'));
 it('is localized and differs between languages',()=>{
  const texts=LANGUAGES.map(language=>formatSavedAgo(NOW-3*HOUR,NOW,language));
  expect(new Set(texts).size).toBe(LANGUAGES.length);
  for(const text of texts)expect(text.trim().length).toBeGreaterThan(0);
 });
});
