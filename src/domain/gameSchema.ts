import { z } from 'zod';

const boundedPercent = z.number().min(0).max(100);
const ministryAllocations = z.object({ economy: z.number().min(0).max(100), defense: z.number().min(0).max(100), science: z.number().min(0).max(100), intelligence: z.number().min(0).max(100), interior: z.number().min(0).max(100), society: z.number().min(0).max(100) });

export const countryStateSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), iso2: z.string().min(2).max(3), mapName: z.string().min(1), mapNumericId: z.string().min(1), region: z.string(), subregion: z.string(), controllerCountryId: z.string().nullable(), globalSanctions: z.boolean(),
  demographics: z.object({ population: z.number().positive(), workforce: z.number().nonnegative(), growthRate: z.number() }),
  economy: z.object({ gdp: z.number().positive(), treasury: z.number(), debt: z.number().nonnegative(), taxRate: z.number().min(0).max(60), inflation: z.number(), unemployment: boundedPercent, productivity: z.number().positive() }),
  resources: z.object({ food: z.number().nonnegative(), oil: z.number().nonnegative(), iron: z.number().nonnegative(), uranium: z.number().nonnegative() }),
  resourceProduction: z.object({ food: z.number().nonnegative(), oil: z.number().nonnegative(), iron: z.number().nonnegative(), uranium: z.number().nonnegative() }),
  processedResources: z.object({ fuel: z.number().nonnegative(), steel: z.number().nonnegative(), electricity: z.number().nonnegative() }),
  industry: z.object({ factories: z.number().int().nonnegative(), refineries: z.number().int().nonnegative(), mines: z.number().int().nonnegative(), powerCapacity: z.number().nonnegative(), utilization: boundedPercent }),
  politics: z.object({ approval: boundedPercent, stability: boundedPercent, regime: z.enum(['republic','democracy','autocracy','monarchy','theocracy']), electionDaysRemaining: z.number().int().nonnegative() }),
  society: z.object({ dominantReligion: z.enum(['christianity','catholic_christianity','orthodox_christianity','protestant_christianity','islam','hinduism','buddhism','judaism','unaffiliated','folk_or_mixed']), ideology: z.enum(['pluralist','state_centric','state_socialist','royalist','religious_state']), cohesion: boundedPercent, secularization: boundedPercent, influencePressure: z.object({ ideology: boundedPercent, religion: boundedPercent }) }),
  military: z.object({
    personnel: z.number().int().nonnegative(), tanks: z.number().int().nonnegative(), artillery: z.number().int().nonnegative(), fighters: z.number().int().nonnegative(), bombers: z.number().int().nonnegative(), warships: z.number().int().nonnegative(), readiness: boundedPercent, morale: boundedPercent, logistics: boundedPercent, technology: boundedPercent,
    assessment: z.object({ gfpRank: z.number().int().positive().nullable(), gfpIndex: z.number().positive().nullable(), capability: boundedPercent, dataConfidence: z.enum(['gfp-2026','estimated']) }),
  }),
  diplomacy: z.object({ relations: z.record(z.string(), z.object({ score: z.number().min(-100).max(100), status: z.enum(['war','hostile','neutral','friendly','ally']), treaties: z.array(z.enum(['trade','nonAggression','alliance'])), sanctions: z.boolean() })), reputation: boundedPercent }),
  intelligence: z.object({ networkStrength: boundedPercent, counterIntelligence: boundedPercent, intelConfidence: boundedPercent }),
  ministries: z.object({ allocations: ministryAllocations, efficiency: ministryAllocations }),
  technology: z.object({ researchPoints: z.number().nonnegative(), unlocked: z.array(z.string()) }),
  ai: z.object({ strategicGoal: z.enum(['stabilize','grow_economy','rearm','secure_resources','expand_influence']), goalProgress: boundedPercent, threatFocus: z.string().nullable(), lastGoalReviewDay: z.number().int().nonnegative() }),
});
