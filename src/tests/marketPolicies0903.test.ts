import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {executeCommandResult} from '../engine/commands';
import {commodityExchange,commodityOrderPreview} from '../engine/systems/commodityExchange';
import {exchangeStock} from '../engine/systems/livingEconomy';
import {commandReceipt} from '../store/commandReceipt';
import {money} from '../ui/formatMoney';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_0903} from '../i18n/uiCatalog0903';
import type {GameCommand} from '../domain/commands';

const base=()=>{const s=makeInitialState();s.countries[s.playerCountryId].economy.treasury=1000;return s;};
const metric=(receipt:ReturnType<typeof commandReceipt>,label:string)=>receipt.metrics!.find(m=>m[0]===label)![1];
describe('actual commodity execution receipts',()=>{
 it('includes all-in debit, cargo and unchanged physical reserves',()=>{
  const s=base(),id=s.playerCountryId;
  const q=commodityOrderPreview(s,id,'oil','buy',1);expect(q.allowed,q.reasons.join('; ')).toBe(true);
  const command:GameCommand={type:'commodity/order',good:'oil',side:'buy',quantity:1,commandId:'oil-receipt'};
  const result=executeCommandResult(s,command),receipt=commandReceipt(s,command,result);
  expect(receipt.outcome).toBe('success');expect(receipt.asset).toBe('oil');
  expect(metric(receipt,'Total paid')).toBe(`−${money(q.total,s.playerProfile.language)}`);
  expect(metric(receipt,'Treasury now')).toBe(money(result.state.countries[id].economy.treasury,s.playerProfile.language));
  expect(metric(receipt,'Incoming cargo')).toBe('+1.000 units');
  expect(metric(receipt,'Days until arrival')).toBe(String(q.arrivalDays));
  expect(exchangeStock(result.state,id,'oil')).toBe(exchangeStock(s,id,'oil'));
  expect(metric(receipt,'Current reserves')).toBe(`${exchangeStock(s,id,'oil').toFixed(3)} units`);
  expect(commodityExchange(result.state).positions[id].oil!.inbound).toBe(1);
  expect(s.countries[id].economy.treasury).toBe(1000);
 });
 it('shows vaulted gold after buying and pending cash after selling',()=>{
  const before=base(),buy:GameCommand={type:'commodity/order',good:'gold',side:'buy',quantity:1,commandId:'gold-buy'};
  const bought=executeCommandResult(before,buy);expect(bought.status).toBe('applied');
  const purchase=commandReceipt(before,buy,bought);expect(metric(purchase,'Vault holdings')).toBe('1.000 tonnes');expect(purchase.metrics!.some(m=>m[0]==='Incoming cargo')).toBe(false);
  const sell:GameCommand={type:'commodity/order',good:'gold',side:'sell',quantity:.5,commandId:'gold-sell'};
  const sold=executeCommandResult(bought.state,sell);expect(sold.status).toBe('applied');
  const sale=commandReceipt(bought.state,sell,sold),pending=commodityExchange(sold.state).settlements.at(-1)!;
  expect(metric(sale,'Proceeds pending')).toBe(`+${money(pending.amount,before.playerProfile.language)}`);
  expect(metric(sale,'Days until payment')).toBe('1');
  expect(sold.state.countries[before.playerCountryId].economy.treasury).toBe(bought.state.countries[before.playerCountryId].economy.treasury);
 });
 it('failed and duplicate orders never report another stock gain or payment',()=>{
  const s=base(),command:GameCommand={type:'commodity/order',good:'gold',side:'buy',quantity:1,commandId:'deduplicate-receipt'},first=executeCommandResult(s,command);
  const duplicate=executeCommandResult(first.state,command),receipt=commandReceipt(first.state,command,duplicate);
  expect(duplicate.status).toBe('duplicate');expect(receipt.outcome).toBeUndefined();expect(receipt.metricTones).toBeUndefined();
  const poor=base();poor.countries[poor.playerCountryId].economy.treasury=0;
  const blocked=executeCommandResult(poor,command),failure=commandReceipt(poor,command,blocked);
  expect(blocked.status).toBe('unavailable');expect(failure.title).toBe('Command unavailable');expect(failure.outcome).toBeUndefined();expect(failure.summary).toMatch(/Treasury/);
 });
});
it('every new market and policy label is translated into all four other languages',()=>{
 for(const language of ['tr','es','zh','ru'])for(const key of Object.keys(UI_CATALOG_0903))expect(translateText(language,key),`${language}: ${key}`).not.toBe(key);
});
