import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { applyGameCommand } from '../engine/commands';
import { strategicDecisionSpec } from '../engine/systems/strategicDecision';
import { canAutoApprove, shouldConfirmAction, type StrategicActionKind } from '../domain/interaction';
import { countryMapAnchor, microstateVisible, nearestMapMarker } from '../map/mapCoordinates';
import { layoutScreenLabels } from '../map/labelLayout';
import { useGameStore } from '../store/gameStore';

describe('0.73.1 review safety', () => {
  it.each<StrategicActionKind>(['declare_war','alliance','embargo','strategic_bloc','treasury_aid','resource_aid'])('never auto-approves %s even with an old skip preference', kind => {
    expect(canAutoApprove(kind)).toBe(false);
    expect(shouldConfirmAction(kind, {[kind]:true})).toBe(true);
    useGameStore.getState().setConfirmationSkip(kind,true);
    expect(useGameStore.getState().confirmationSkips[kind]).toBe(false);
  });
  it('lets users skip only explicitly approved low-risk actions', () => {
    expect(shouldConfirmAction('trade_pact',{})).toBe(true);
    expect(shouldConfirmAction('trade_pact',{trade_pact:true})).toBe(false);
  });
  it.each(['trade','nonAggression','alliance'] as const)('cannot charge twice for %s', treaty => {
    const state=makeInitialState();
    const player=state.countries[state.playerCountryId];
    player.economy.treasury=100;
    player.diplomacy.relations.GRC={...player.diplomacy.relations.GRC,score:90,treaties:[],status:'friendly'};
    const type=({trade:'diplomacy/signTradePact',nonAggression:'diplomacy/signNonAggression',alliance:'diplomacy/signAlliance'} as const)[treaty];
    const next=applyGameCommand(state,{type,targetCountryId:'GRC'});
    expect(next.countries[player.id].diplomacy.relations.GRC.treaties).toContain(treaty);
    expect(applyGameCommand(next,{type,targetCountryId:'GRC'})).toBe(next);
  });
  it('previews exact resource aid without mutating the simulation', () => {
    const state=makeInitialState();
    const player=state.countries[state.playerCountryId];
    player.resources.food=7;
    const before=JSON.stringify(state);
    const spec=strategicDecisionSpec(state,'resource_aid','GRC',{resource:'food'});
    expect(spec?.impacts.find(x=>x.label==='Shipment')?.value).toBe('7.0 FOOD');
    expect(spec?.impacts.find(x=>x.label==='Remaining reserve')?.value).toBe('0.0');
    expect(JSON.stringify(state)).toBe(before);
    const next=applyGameCommand(state,{type:'diplomacy/giftResource',targetCountryId:'GRC',resource:'food'});
    expect(next.countries[player.id].resources.food).toBe(0);
  });
  it('shows the $20B bloc establishment cost', () => {
    const state=makeInitialState();state.blocs={};
    expect(strategicDecisionSpec(state,'strategic_bloc','GRC')?.impacts).toContainEqual({label:'Treasury',value:'-$20B',tone:'warning'});
  });
});

describe('0.73.1 map interaction', () => {
  it('focuses known microstates without requiring polygon geometry', () => {
    expect(countryMapAnchor('AND')).toEqual([1.6016,42.5462]);
    expect(countryMapAnchor('VAT')).toEqual([12.4534,41.9029]);
    expect(countryMapAnchor('UNKNOWN')).toBeNull();
  });
  it('does not make unrevealed microstates selectable', () => {
    expect(microstateVisible(1,true,false,false)).toBe(false);
    expect(microstateVisible(3,true,false,false)).toBe(true);
    expect(microstateVisible(1,true,true,false)).toBe(true);
    expect(nearestMapMarker([], [100,100])).toBeNull();
  });
  it('selects the nearest marker within the expanded target', () => {
    const markers=[{id:'AND',point:[100,100] as [number,number]},{id:'MCO',point:[120,100] as [number,number]}];
    expect(nearestMapMarker(markers,[103,102])?.id).toBe('AND');
    expect(nearestMapMarker(markers,[118,100])?.id).toBe('MCO');
    expect(nearestMapMarker(markers,[180,100])).toBeNull();
  });
  it('clamps selected edge labels while suppressing nearby microstate labels', () => {
    const placed=layoutScreenLabels([
      {id:'selected',text:'VATICAN CITY',x:4,y:4,fontSize:14,priority:1,force:true},
      {id:'neighbor',text:'ITALY',x:55,y:15,fontSize:14,priority:100},
    ],{width:400,height:300});
    expect(placed.map(x=>x.id)).toEqual(['selected']);
    expect(placed[0].x-placed[0].width/2).toBeGreaterThanOrEqual(8);
    expect(placed[0].y-placed[0].height/2).toBeGreaterThanOrEqual(8);
  });
});
