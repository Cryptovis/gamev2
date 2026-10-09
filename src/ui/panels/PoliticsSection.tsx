// 0.88 track E (audit E2): factions, coalition support, election forecast and regime pressure.
// Every number shown here comes from an engine read function in src/engine/systems/factions.ts.
import { LocaleText } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { FACTION_KEYS } from '../../domain/politics';
import {
  CONCESSION_DAYS, CRISIS_OPTION_LABEL, FACTION_LABEL, REGIME_CRISIS_PRESSURE,
  coalitionSupport, concessionStatus, coupRisk, crisisOptions, electionForecast, factionsFor,
} from '../../engine/systems/factions';
import { formatCostB } from '../../engine/systems/policyPressure';

const pct = (value: number) => `${value.toFixed(0)}%`;

export function PoliticsSection() {
  const s = useGameStore();
  const p = s.countries[s.playerCountryId];
  if (!p) return null;
  const f = factionsFor(p), forecast = electionForecast(s, p.id), risk = coupRisk(s, p.id);
  const concession = concessionStatus(p, s.day), options = crisisOptions(p, s.day);
  return (
    <section className="politics-section" aria-label="Politics">
      <h3><LocaleText value="Politics" /></h3>
      <div className="market-facts">
        <span><LocaleText value="Coalition support" /><strong>{pct(coalitionSupport(p))}</strong></span>
        {forecast && <span><LocaleText value="Next election" /><strong>{forecast.daysRemaining} <LocaleText value="days" /></strong></span>}
        {forecast && <span><LocaleText value="Forecast vote share" /><strong>{forecast.governmentShare.toFixed(1)}% · {pct(forecast.winChance * 100)} <LocaleText value="win chance" /></strong></span>}
        {risk && <span><LocaleText value="Regime pressure" /><strong>{risk.pressure.toFixed(0)}/100 ({risk.dailyChange >= 0 ? '+' : ''}{risk.dailyChange.toFixed(2)}/<LocaleText value="day" />)</strong></span>}
        {risk && <span><LocaleText value="Legitimacy" /><strong>{risk.legitimacy.toFixed(0)}</strong></span>}
      </div>
      {risk && <p><LocaleText value={`A regime crisis opens when pressure reaches ${REGIME_CRISIS_PRESSURE}. Pressure builds while legitimacy (approval, stability and the loyalty of the security forces) stays below 45.`} /></p>}
      {forecast && <p><LocaleText value="The election is a contest: approval, coalition support and the economy set the expected vote share, and the campaign can swing it by up to six points either way." /></p>}
      <table className="politics-factions">
        <thead><tr><th><LocaleText value="Faction" /></th><th><LocaleText value="Strength" /></th><th><LocaleText value="Satisfaction" /></th><th /></tr></thead>
        <tbody>
          {FACTION_KEYS.map((k) => (
            <tr key={k}>
              <td><LocaleText value={FACTION_LABEL[k]} />{f.concession?.faction === k && f.concession.untilDay >= s.day ? <small> · <LocaleText value="concession until day" /> {f.concession.untilDay}</small> : null}</td>
              <td>{pct(f.strength[k])}</td>
              <td>{pct(f.satisfaction[k])}</td>
              <td>
                <button disabled={!concession.allowed} title={concession.reason} onClick={() => s.dispatch({ type: 'politics/concession', faction: k })}>
                  <LocaleText value="Concession" /> {formatCostB(concession.costB)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><small><LocaleText value={`A concession courts one faction for ${CONCESSION_DAYS} days. Only one concession can run at a time.`} /></small></p>
      {risk?.crisis && (
        <div className="politics-crisis" role="alert">
          <strong><LocaleText value="Regime crisis" /> · {risk.daysToDeadline} <LocaleText value="days to decide" /> · <LocaleText value="coup chance" /> {pct(risk.coupChanceAtDeadline * 100)}</strong>
          {risk.crisis.response
            ? <p><LocaleText value="Response ordered:" /> <LocaleText value={CRISIS_OPTION_LABEL[risk.crisis.response]} /></p>
            : <div className="event-options">{options.map((o) => (
                <button key={o.option} disabled={!o.allowed} title={o.reason} onClick={() => s.dispatch({ type: 'politics/crisisResponse', option: o.option })}>
                  <strong><LocaleText value={CRISIS_OPTION_LABEL[o.option]} /></strong>
                  <span>{formatCostB(o.costB)} · −{o.pressureRelief.toFixed(0)} <LocaleText value="pressure" /></span>
                </button>
              ))}</div>}
        </div>
      )}
    </section>
  );
}
