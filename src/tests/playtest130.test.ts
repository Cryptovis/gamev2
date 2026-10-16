import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {commandReceipt} from '../store/commandReceipt';
import type {CommandResult} from '../engine/commands';
import {ORGANIZATION_IDS} from '../domain/organizations';
import {OrganizationEmblem} from '../ui/icons/OrganizationIcons';
import {ALL_HINTS,SOVEREIGN_CREDIT_HINT} from '../ui/hints/registry';

describe('supply contract receipt',()=>{
  it('shows monthly delivery, unit price, monthly cost and delivery start with both countries',()=>{
    const s=makeInitialState(),partnerId=Object.keys(s.countries).find(id=>id!==s.playerCountryId)!;
    const receipt=commandReceipt(s,{type:'trade/createLongTermContract',targetCountryId:partnerId,resource:'oil',years:3},{status:'applied',state:s,message:'ok'} as unknown as CommandResult);
    expect(receipt.title).toBe('Supply Agreement Signed');
    expect(receipt.metrics?.map(m=>m[0])).toEqual(['Monthly delivery','Unit price','Total monthly cost','Delivery start']);
    expect(receipt.parties?.right.name).toBe(s.countries[partnerId].name);
    expect(receipt.nextSteps).toContain('30 days');
  });
});
describe('organization emblems',()=>{
  it('draws one emblem per organization at 36px',()=>{
    for(const id of ORGANIZATION_IDS){const html=renderToStaticMarkup(createElement(OrganizationEmblem,{id}));expect(html).toContain(`data-emblem="${id}"`);expect(html).toContain('width="36"');expect(html).toContain('currentColor');}
  });
});
describe('sovereign credit hint',()=>{
  it('carries the long rule text and is registered',()=>{
    expect(ALL_HINTS).toContain(SOVEREIGN_CREDIT_HINT);
    expect(SOVEREIGN_CREDIT_HINT.bodyKey).toContain('assessed after three game days');
    expect(SOVEREIGN_CREDIT_HINT.extraKeys?.[0]).toContain('rescue offer');
  });
});
