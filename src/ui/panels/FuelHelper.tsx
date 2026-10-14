import {useWorldView} from '../../store/useWorldView';
import {ExecutiveWorkspaceShell} from '../windows/ExecutiveWorkspaceShell';
import {LocaleText} from '../../i18n/localeText';
import {fuelGuidance} from '../../engine/systems/fuelGuidance';
import {FACILITIES} from '../../data/industrialCatalog';
import type {WorkspaceDestination} from '../../store/workspaceNavigation';

export function FuelHelper({targetCountryId:target,active}:{targetCountryId:string;active:boolean}){
 const state=useWorldView();
 const returnTo:WorkspaceDestination=target===state.playerCountryId?{kind:'fuel-help',targetCountryId:target}:{kind:'operational-assessment',targetCountryId:target};
 const fuel=fuelGuidance(state)!;
 return <ExecutiveWorkspaceShell id="fuel-help-window" title="How to get Fuel?" active={active} onClose={state.closeWorkspace}>
  <div className="fuel-guidance"><p><LocaleText value="Crude oil is not refined fuel. Refineries turn crude oil into fuel each campaign day; utilization and refining research affect output."/></p>
  <dl><div><dt><LocaleText value="Refined Fuel"/></dt><dd>{fuel.stock.toLocaleString(state.playerProfile.language)}</dd></div><div><dt><LocaleText value="Required fuel"/></dt><dd>{fuel.readiness.required.toLocaleString(state.playerProfile.language)}</dd></div><div><dt><LocaleText value="Estimated net fuel / day"/></dt><dd>{fuel.net.toLocaleString(state.playerProfile.language,{maximumFractionDigits:2})}</dd></div></dl>
  <p><LocaleText value="Industrial Park adds one refinery when construction completes. Review its budget and construction time before confirming."/> {FACILITIES.civil_factory.days} <LocaleText value="Days"/></p>
  <p><LocaleText value="Spot purchases transfer available fuel now. Monthly contracts first deliver after 30 days and require stock, funds and diplomatic access on every delivery."/></p>
  <p><LocaleText value="These shortcuts only open planning screens. They do not build, buy or sign a contract."/></p>
  <div className="fuel-helper-actions"><button data-guide="fuel-refineries" onClick={()=>state.routeWorkspace({kind:'factory',focusedFactory:'civil_factory',returnTo})}><LocaleText value="Build Refineries"/></button>
  <button data-guide="fuel-market" onClick={()=>state.routeWorkspace({kind:'market',tab:'open',focusedGood:'fuel',returnTo})}><LocaleText value="Commodity Market"/></button>
  <button data-guide="fuel-contracts" onClick={()=>state.routeWorkspace({kind:'market',tab:'contracts',focusedGood:'fuel',returnTo})}><LocaleText value="Refined fuel supply contracts"/></button></div>
  </div>
 </ExecutiveWorkspaceShell>;
}
