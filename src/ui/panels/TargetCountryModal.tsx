import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { flagEmoji } from '../../data/countryThemes';
import { compactMoney } from '../formatMoney';
import { useWorldView } from '../../store/useWorldView';
import { useAudioSettings } from '../../audio/audioSettings';
import { shouldConfirmAction, type StrategicActionKind, type StrategicDecisionSpec } from '../../domain/interaction';
import type { GameCommand } from '../../domain/commands';
import { strategicDecisionSpec, type StrategicDecisionContext } from '../../engine/systems/strategicDecision';
import { useWindowLifecycle, WINDOW_LAYERS } from '../windows/useWindowLifecycle';
import { StrategicDecisionModal } from './StrategicDecisionModal';
import { AssetThumbnail } from '../icons/AssetThumbnail';
import { CivicArt } from '../icons/CivicArt';
import { CommandArt } from '../icons/CommandArt';
import { targetHubActions, targetHubSummary, type HubAction, type HubArt } from './targetCountryHub';

function HubArtwork({ art }: { art: HubArt }) {
  if (art.set === 'asset') return <AssetThumbnail asset={art.kind} size={52} />;
  if (art.set === 'civic') return <CivicArt kind={art.kind} size={52} />;
  return <CommandArt kind={art.kind} size={52} />;
}

/**
 * Phase 6.1: the diplomatic hub that opens when the player selects another country.
 * Every button sends a typed GameCommand through the store (with the same strategic review as the Full Dossier);
 * the full 14-section country panel stays one click away.
 */
export function TargetCountryModal({ countryId, onOpenDossier }: { countryId: string; onOpenDossier: () => void }) {
  const state = useWorldView();
  const lowEffects = useAudioSettings((a) => a.lowEffects);
  const [pending, setPending] = useState<{ spec: StrategicDecisionSpec; execute: () => void } | null>(null);
  const ref = useRef<HTMLElement>(null);
  // While a child tool (e.g. the proposal tracker) is open the selection lives in the workspace trail: stay mounted, hidden.
  const visible = state.selectedCountryId === countryId;
  useWindowLifecycle(ref, { onClose: state.closeWorkspace, layer: WINDOW_LAYERS.workspace, enabled: visible && !pending });
  const summary = useMemo(() => targetHubSummary(state, countryId), [state, countryId]);
  const actions = useMemo(() => targetHubActions(state, countryId), [state, countryId]);
  const player = state.countries[state.playerCountryId], target = state.countries[countryId];
  if (!summary || !player || !target) return null;
  const language = state.playerProfile.language;
  const war = Object.values(state.wars).find((w) => w.status === 'active' && ((w.attackerId === player.id && w.defenderId === target.id) || (w.defenderId === player.id && w.attackerId === target.id)));

  const send = (command: GameCommand, decision?: StrategicActionKind, context: StrategicDecisionContext = {}) => {
    const execute = () => state.dispatchWithReceipt(command);
    if (!decision || !shouldConfirmAction(decision, state.confirmationSkips)) { execute(); return; }
    const spec = strategicDecisionSpec(state, decision, target.id, context);
    if (!spec) return;
    setPending({ spec, execute });
  };
  const press = (action: HubAction) => {
    if (action.trackProposal) { state.navigate('diplomacy-inbox', target.id); return; }
    send(action.command, action.decision);
  };

  const node = <div className="target-hub-backdrop" hidden={!visible} onMouseDown={state.closeWorkspace}>
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="target-hub-title" className={`target-hub stance-${summary.stance.toLowerCase().replaceAll(' ', '-')}${lowEffects ? ' low-effects' : ''}`} data-country={target.id} onMouseDown={(e) => e.stopPropagation()}>
      <header className="target-hub-header">
        <div className="target-hub-flags" aria-hidden="true">
          <span className="target-hub-flag own"><LocaleText value={flagEmoji(player.iso2)} /></span>
          <i className="target-hub-link"><LocaleText value={summary.atWar ? '⚔' : '⇄'} /></i>
          <span className="target-hub-flag target"><LocaleText value={flagEmoji(target.iso2)} /></span>
        </div>
        <div className="target-hub-title">
          <small><LocaleText value="DIPLOMATIC HUB" /></small>
          <h2 id="target-hub-title"><LocaleText value={target.name} />{summary.capital && <span className="target-hub-capital"><LocaleText value={' · '} /><LocaleText value={summary.capital} /></span>}</h2>
        </div>
        <button className="target-hub-close" data-guide="close-workspace" onClick={state.closeWorkspace} aria-label={translateLive('Close diplomatic hub')} title={translateLive('Return to map')}><LocaleText value={'×'} /></button>
      </header>

      {war && <div className="target-hub-war" role="status"><strong><LocaleText value="At war" /></strong><button onClick={() => state.openWarWindow(war.id)}><LocaleText value="OPEN WAR COMMAND" /></button></div>}

      <dl className="target-hub-stats">
        <div><dt><LocaleText value="Treasury" /></dt><dd>{compactMoney(summary.treasuryB, language)}</dd></div>
        <div><dt><LocaleText value="Military power" /></dt><dd>{summary.gfpRank ? <span translate="no">GFP #{summary.gfpRank}</span> : <>{summary.capability.toFixed(0)}<small>/100</small></>}</dd></div>
        <div><dt><LocaleText value="Population" /></dt><dd>{(summary.population / 1_000_000).toFixed(1)}<small><LocaleText value="M" /></small></dd></div>
        <div className="target-hub-relation"><dt><LocaleText value="Relations" /></dt><dd><span aria-hidden="true">{summary.mood}</span> <LocaleText value={summary.atWar ? 'WAR' : summary.stance} /> <b>{summary.relationIndex}</b><small>/100</small></dd><i className="target-hub-meter" aria-hidden="true"><b style={{ width: `${summary.relationIndex}%` }} /></i></div>
      </dl>

      <div className="target-hub-grid" role="list">
        {actions.map((action) => <article key={action.id} role="listitem" className={`hub-card tone-${action.tone} status-${action.status}`} data-action={action.id}>
          {action.variants
            ? <div className="hub-card-main">
                <span className="hub-card-art"><HubArtwork art={action.art} /></span>
                <span className="hub-card-copy"><strong><LocaleText value={action.title} /></strong><small><LocaleText value={action.detail} /></small></span>
              </div>
            : <button className="hub-card-main" disabled={!action.allowed} onClick={() => press(action)}>
                <span className="hub-card-art"><HubArtwork art={action.art} /></span>
                <span className="hub-card-copy"><strong><LocaleText value={action.title} /></strong><small><LocaleText value={action.detail} /></small></span>
                {action.status === 'active' && <span className="hub-card-check" title={translateLive('Active')}><LocaleText value={'✓'} /></span>}
                {action.status === 'locked' && !action.trackProposal && <span className="hub-card-lock" title={translateLive('Locked')}><LocaleText value={'🔒'} /></span>}
              </button>}
          {action.variants && <div className="hub-card-variants">{action.variants.map((variant) => <button key={variant.label} disabled={!variant.allowed} onClick={() => send(variant.command, action.decision, variant.context)}><LocaleText value={variant.label} /></button>)}</div>}
        </article>)}
      </div>

      <footer className="target-hub-footer">
        <p><LocaleText value="Costs, acceptance and cooldowns follow the same rules as the Full Dossier." /></p>
        <button className="target-hub-dossier" data-guide="open-full-dossier" onClick={onOpenDossier}><CommandArt kind="overview" size={22} /><LocaleText value="Full Dossier" /></button>
      </footer>
    </section>
  </div>;

  return <>
    {typeof document === 'undefined' ? node : createPortal(node, document.body)}
    {pending && <StrategicDecisionModal spec={pending.spec} onCancel={() => setPending(null)} onConfirm={() => { pending.execute(); setPending(null); }} />}
  </>;
}
