import {describe,it,expect} from 'vitest';
import {compactMoney} from '../ui/formatMoney';
describe('compact setup money in USD billions',()=>{
 it('shows large GDP and small treasuries without changing units',()=>{
  expect(compactMoney(1300)).toBe('$1.3T');
  expect(compactMoney(143)).toBe('$143B');
  expect(compactMoney(0.125)).toBe('$125M');
  expect(compactMoney(-0.125)).toBe('-$125M');
  expect(compactMoney(Infinity)).toBe('—');
 });
 it('uses each supported language number conventions',()=>{
  expect(compactMoney(1300,'tr')).toMatch(/1,3.*Tn/);
  expect(compactMoney(1300,'es')).toMatch(/1,3.*B/);
  expect(compactMoney(1300,'zh')).toContain('1.3万亿');
  expect(compactMoney(1300,'ru')).toMatch(/1,3.*трлн/);
 });
});
