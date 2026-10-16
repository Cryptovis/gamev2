// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {CountryTradeDesk} from '../ui/panels/TradeDesk';
import {useGameStore} from '../store/gameStore';
import {makeInitialState} from '../data/initialState';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let host:HTMLDivElement,root:Root;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);
  const s=makeInitialState();s.playerProfile={...s.playerProfile,language:'en',setupComplete:true};s.speed=0;s.world.tutorial.active=false;
  useGameStore.setState({...s,activeTool:null,workspaceTrail:[],navigation:null,actionReceipt:null});});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();});

describe('CountryTradeDesk hook order (Rules of Hooks regression)',()=>{
  it('survives switching between the player country and a partner, in both directions',async()=>{
    const s=useGameStore.getState(),partner=Object.values(s.countries).find(c=>c.id!==s.playerCountryId)!;
    await act(async()=>{root.render(createElement(CountryTradeDesk,{country:s.countries[s.playerCountryId]}));});
    await act(async()=>{root.render(createElement(CountryTradeDesk,{country:partner}));});
    await act(async()=>{root.render(createElement(CountryTradeDesk,{country:s.countries[s.playerCountryId]}));});
    expect(host.querySelector('.trade-desk')).not.toBeNull();
  });
});
