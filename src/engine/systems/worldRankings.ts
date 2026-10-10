import type { GameState } from '../../domain/game';
import { activeCountries } from '../../domain/sovereignty';
import { militaryPower } from './warfare';
import { creditRating } from './sovereignCredit';
export type RankingKind = 'military' | 'financial' | 'diplomacy';
/** Live campaign values, not a claim of current real-world ratings. */
export function worldRankings(s: GameState, kind: RankingKind) {
    return activeCountries(s.countries).map(c => {
        const rating = creditRating(s, c.id);
        const allies = Object.values(c.diplomacy.relations).filter(r => r.treaties.includes('alliance') && r.status !== 'war').length;
        const influence = s.council.influenceByCountry[c.id] ?? 0;
        const score = kind === 'military' ? militaryPower(c) : kind === 'financial' ? c.economy.gdp : c.diplomacy.reputation * .6 + influence * .3 + Math.min(10, allies);
        return { country: c, score, rating, allies, influence, debtRatio: c.economy.debt / Math.max(.001, c.economy.gdp) * 100 };
    }).sort((a, b) => b.score - a.score || a.country.id.localeCompare(b.country.id));
}
