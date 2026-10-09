import { useMemo } from 'react';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { campaignVictoryProgress, type VictoryRequirement } from '../../engine/systems/campaignVictory';

const shown = (value: number) => String(Number(value.toFixed(value >= 100 ? 0 : 2)));
const requirementText = (r: VictoryRequirement) => `${r.label}: ${shown(r.current)} / ${r.comparison === 'atMost' ? '≤' : ''}${shown(r.target)}`;

/** Victory paths and their progress, from the engine's campaignVictoryProgress (audit E4). */
export function CampaignVictoryProgress() {
  const day = useGameStore((s) => s.day);
  const status = useGameStore((s) => s.campaignStatus);
  const paths = useMemo(() => campaignVictoryProgress(useGameStore.getState()), [day, status]);
  const achieved = useGameStore((s) => s.world.campaign?.achieved);
  if (!paths.length) return null;
  return <section className="campaign-victory-progress" aria-label={translateLive("Victory paths")}>
    <div className="floating-progress"><span><b><LocaleText value="VICTORY PATHS"/></b>{achieved && <> · <LocaleText value="Victory achieved"/></>}</span></div>
    <div className="floating-objectives">{paths.map((p) => <div key={p.path} className={p.complete || achieved?.path === p.path ? 'done' : ''}>
      <b>{Math.round(p.progress * 100)}%</b>
      <span>
        <strong><LocaleText value={p.title}/></strong>
        <small><LocaleText value={p.summary}/></small>
        {p.requirements.map((r) => <small key={r.label} className={r.met ? 'met' : ''}><LocaleText value={r.met ? '✓' : '○'}/> <LocaleText value={requirementText(r)}/></small>)}
        {p.heldDays !== undefined && p.heldDays > 0 && <small><LocaleText value={`Conditions held: ${p.heldDays} days`}/></small>}
      </span>
    </div>)}</div>
  </section>;
}
