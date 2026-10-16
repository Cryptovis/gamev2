import {describe,expect,it} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {AGREEMENT_BASE_COST,agreementCost} from '../engine/systems/treaties';
import {industrialOrderPreview} from '../engine/systems/tradeOptions';
import {commandReceipt} from '../store/commandReceipt';
import type {CommandResult} from '../engine/commands';
import {GOODS} from '../data/industrialCatalog';
import type {IndustrialGood} from '../domain/industrial';

describe('realistic embassy cost',()=>{
  it('uses a $0.05B base, far below the old $3B',()=>{
    expect(AGREEMENT_BASE_COST.embassy).toBe(0.05);
    const s=makeInitialState();
    expect(agreementCost(s,s.playerCountryId,'embassy')).toBeLessThan(0.5);
    expect(agreementCost(s,s.playerCountryId,'embassy')).toBeGreaterThan(0);
  });
});

describe('industrial order preview (quantity stepper)',()=>{
  const s=makeInitialState(),good=Object.keys(GOODS)[0] as IndustrialGood,partner=Object.keys(s.countries).find(id=>id!==s.playerCountryId)!;
  it('clamps to the maximum, prices the shipment and never goes negative',()=>{
    for(const direction of ['buy','sell'] as const){
      const zero=industrialOrderPreview(s,partner,good,0,direction);
      expect(zero.quantity).toBe(0);expect(zero.value).toBe(0);expect(zero.maxQuantity).toBeGreaterThanOrEqual(0);
      const huge=industrialOrderPreview(s,partner,good,1e9,direction);
      expect(huge.quantity).toBe(huge.maxQuantity);expect(huge.value).toBeCloseTo(huge.quantity*huge.unitPrice,9);
      expect(industrialOrderPreview(s,partner,good,-5,direction).quantity).toBe(0);
    }
  });
});

describe('informative receipts',()=>{
  const s=makeInitialState(),partnerId=Object.keys(s.countries).find(id=>id!==s.playerCountryId)!;
  const applied={status:'applied',state:s,message:'ok'} as unknown as CommandResult;
  it('names both countries, the action and the next steps for diplomatic and trade commands',()=>{
    const pact=commandReceipt(s,{type:'diplomacy/signTradePact',targetCountryId:partnerId},applied);
    expect(pact.title).toBe('Trade Pact Proposed');expect(pact.parties?.left.name).toBe(s.countries[s.playerCountryId].name);expect(pact.parties?.right.name).toBe(s.countries[partnerId].name);
    expect(pact.nextSteps).toContain('3 campaign days');
    expect(commandReceipt(s,{type:'diplomacy/request',id:partnerId,kind:'embassy',years:1},applied).title).toBe('Diplomatic Delegation Dispatched');
    expect(commandReceipt(s,{type:'industry/order',partnerId,good:Object.keys(GOODS)[0] as IndustrialGood,quantity:1,direction:'buy',years:0},applied).title).toBe('Industrial Order Placed');
  });
  it('keeps the generic receipt for failed commands and unrelated commands',()=>{
    const failed=commandReceipt(s,{type:'diplomacy/signTradePact',targetCountryId:partnerId},{...applied,status:'unavailable'} as unknown as CommandResult);
    expect(failed.parties).toBeUndefined();expect(failed.title).toBe('Command unavailable');
  });
});
