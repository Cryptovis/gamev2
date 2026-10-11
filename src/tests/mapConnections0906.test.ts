import {describe,it,expect} from 'vitest';
import {connectionIndex} from '../map/connectionIndex';

describe('map relationship ledger index',()=>{
 it('matches the previous polygon scan for buyer/seller, contract, embassy and inactive cases',()=>{
  const trades={a:{buyerId:'TUR',sellerId:'FRA',active:true},b:{buyerId:'DEU',sellerId:'TUR',active:true},c:{buyerId:'TUR',sellerId:'USA',active:false},d:{buyerId:'USA',sellerId:'GBR',active:true}};
  const contracts={a:{buyerId:'TUR',sellerId:'JPN',active:true},b:{buyerId:'GRC',sellerId:'TUR',active:true},c:{buyerId:'TUR',sellerId:'RUS',active:false}};
  const embassies={a:{countryA:'TUR',countryB:'FRA'},b:{countryA:'ESP',countryB:'TUR'},c:{countryA:'DEU',countryB:'USA'}};
  for(const player of ['TUR','FRA','USA','missing']){
   const index=connectionIndex(player,trades,contracts,embassies);
   for(const id of ['TUR','FRA','DEU','USA','GBR','JPN','GRC','RUS','ESP','missing']){
    const connected=(d:{buyerId:string;sellerId:string;active:boolean})=>d.active&&((d.buyerId===player&&d.sellerId===id)||(d.sellerId===player&&d.buyerId===id));
    expect(index.tradePartners.has(id)).toBe(Object.values(trades).some(connected)||Object.values(contracts).some(connected));
    expect(index.embassyPartners.has(id)).toBe(Object.values(embassies).some(e=>(e.countryA===player&&e.countryB===id)||(e.countryB===player&&e.countryA===id)));
   }
  }
 });
 it('examines an archived ledger once and reuses constant-time partner queries',()=>{
  let reads=0;
  const ledger=Object.fromEntries(Array.from({length:3000},(_,i)=>[String(i),{buyerId:'TUR',sellerId:'FRA',get active(){reads++;return false;}}]));
  const index=connectionIndex('TUR',ledger,{},{});
  for(let polygon=0;polygon<250;polygon++)expect(index.tradePartners.has('FRA')).toBe(false);
  expect(reads).toBe(3000);
 });
 it('rebuilds from changed records without retaining expired partners or another player',()=>{
  const active={buyerId:'TUR',sellerId:'FRA',active:true};
  expect(connectionIndex('TUR',{active},{},{}).tradePartners.has('FRA')).toBe(true);
  expect(connectionIndex('TUR',{active:{...active,active:false}},{},{}).tradePartners.size).toBe(0);
  expect(connectionIndex('USA',{active},{},{}).tradePartners.size).toBe(0);
  expect(connectionIndex('TUR',{},{},{}).embassyPartners.size).toBe(0);
 });
});
