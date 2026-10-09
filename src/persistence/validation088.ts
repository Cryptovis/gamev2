import { z } from 'zod';

// 0.88 optional save fields (no schema bump): campaign victory tracking, event-chain flags, the event subject
// and the shared advisor pop-up day. Every field may be absent; when present it must be well formed.

const finite = z.number().finite();
const path = z.enum(['mandate', 'economic', 'diplomatic']);
const campaign = z.object({
  reelections: finite.int().nonnegative(),
  lastElectionDays: finite,
  startGdp: finite.nonnegative(),
  startDay: finite,
  holdingSince: z.partialRecord(path, finite),
  achieved: z.object({ path, day: finite }).optional(),
  sandbox: z.boolean().optional(),
});
const flags = z.record(z.string(), finite);
const fields = z.looseObject({
  world: z.looseObject({
    campaign: campaign.optional(),
    living: z.looseObject({ advice: z.looseObject({ lastPopupDay: finite.optional() }).optional() }).optional(),
  }),
  countries: z.record(z.string(), z.looseObject({ eventFlags: flags.optional() })),
  activeEvent: z.looseObject({ subjectCountryId: z.string().optional() }).nullable().optional(),
});

export function valid088Fields(value: unknown): boolean {
  return fields.safeParse(value).success;
}
