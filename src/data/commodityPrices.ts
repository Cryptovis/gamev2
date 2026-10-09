import type {TradeResource} from '../domain/game';
import type {IndustrialGood} from '../domain/industrial';

/**
 * One reference price scale for every traded commodity, in $B per unit (audit C10).
 * Raw resources (food, oil, iron, uranium) were already on this scale; industrial goods were priced
 * 50-1000x lower, so a refinery kept 1.5% of the oil value it consumed and mines earned 1/30 of upkeep.
 *
 * Calibration rule, checked by src/tests/industrialMarket087.test.ts: at reference conditions
 * (deposit potential 1, REFERENCE_UTILIZATION, full upkeep) every facility's output is worth more than
 * its inputs plus upkeep, and refining adds value (fuel > oil/0.9, steel > iron/0.86).
 * Market prices (trade.ts, industrialMarket.ts) are these values times a scarcity factor.
 */
export const REFERENCE_PRICES:Record<TradeResource|IndustrialGood,number>={
 food:.025,oil:.06,iron:.04,uranium:.22,
 fuel:.08,steel:.055,
 water:.0011,coal:.0065,copper:.015,silicon:.008,aluminum:.022,rare_earths:.08,rubber:.0135,
 gold:.13,silver:.0011,
 armor_plate:.011,engines:.025,electronics:.007,tanks:.1,
};
/** Utilization (percent) at which REFERENCE_PRICES are calibrated. */
export const REFERENCE_UTILIZATION=85;
