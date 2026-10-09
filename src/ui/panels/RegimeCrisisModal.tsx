// 0.88 track E (audit E2): the player's regime-crisis warning. The crisis lives in the engine (factions.ts);
// closing this dialog without an answer leaves it open until its deadline, where an ignored crisis ends in a coup.
import { LocaleText } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { CRISIS_OPTION_LABEL, coupRisk, crisisOptions } from '../../engine/systems/factions';
import { formatCostB } from '../../engine/systems/policyPressure';
import type { CrisisOption } from '../../domain/politics';

const OPTION_HINT: Record<CrisisOption, string> = {
  concede: 'Security forces satisfaction +20 and a 180-day concession.',
  crackdown: 'Approval -4, stability +3, reputation -5; liberals and labour turn against you.',
  reform: 'Approval +4, stability -2; liberals and labour gain, the security forces lose.',
};

export function RegimeCrisisModal() {
  const crisis = useGameStore((s) => s.countries[s.playerCountryId]?.politics.factions?.crisis);
  const status = useGameStore((s) => s.campaignStatus);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!crisis || crisis.response || crisis.acknowledged || status !== 'active') return null;
  const s = useGameStore.getState(), p = s.countries[s.playerCountryId], risk = coupRisk(s, p.id), options = crisisOptions(p, s.day);
  return (
    <div className="event-backdrop">
      <section className="event-modal" role="alertdialog" aria-label="Regime crisis">
        <div className="panel-kicker"><LocaleText value="REGIME CRISIS" /></div>
        <h2><LocaleText value="Security services warn of a plot" /></h2>
        <p><LocaleText value="Officers in the security establishment are sounding out rivals of the government. Answer before the deadline: an ignored crisis ends in a coup and the campaign is lost." /></p>
        {risk && <p><strong><LocaleText value="Deadline" />: {risk.daysToDeadline} <LocaleText value="days" /> · <LocaleText value="Regime pressure" /> {risk.pressure.toFixed(0)}/100 · <LocaleText value="Legitimacy" /> {risk.legitimacy.toFixed(0)}</strong></p>}
        <div className="event-options">
          {options.map((o, i) => (
            <button key={o.option} disabled={!o.allowed} title={o.reason} onClick={() => dispatch({ type: 'politics/crisisResponse', option: o.option })}>
              <em><LocaleText value="OPTION " /><LocaleText value={String(i + 1).padStart(2, '0')} /></em>
              <strong><LocaleText value={CRISIS_OPTION_LABEL[o.option]} /></strong>
              <span>{formatCostB(o.costB)} · −{o.pressureRelief.toFixed(0)} <LocaleText value="pressure" /> · <LocaleText value={OPTION_HINT[o.option]} /></span>
            </button>
          ))}
        </div>
        <button className="restart-button" onClick={() => dispatch({ type: 'politics/acknowledgeCrisis' })}><LocaleText value="Decide later" /></button>
      </section>
    </div>
  );
}
