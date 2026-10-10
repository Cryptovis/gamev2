import { z } from 'zod';
const finite = z.number().finite(), day = finite.int().positive(), id = z.string().min(1);
const history = z.record(id, z.object({ bonus: finite.min(0).max(10), defaults: finite.int().min(0).max(20), lastRewardDay: day.optional() }));
const application = z.object({ id, offerId: id, actorId: id, borrowerId: id, lenderId: id, principal: finite.min(.001), apr: finite.min(0).max(30), days: z.union([z.literal(90), z.literal(180), z.literal(365), z.literal(730), z.literal(1095)]), createdDay: day, decisionDay: day, status: z.enum(['pending', 'approved', 'rejected']), reason: z.string().optional(), loanId: id.optional() });
const fields = z.looseObject({ day, countries: z.record(id, z.unknown()), world: z.looseObject({ expansion: z.looseObject({ creditHistory: history.optional(), creditApplications: z.array(application).max(1000).optional(), creditOffers: z.array(z.looseObject({ id, extendedDays: z.union([z.literal(730), z.literal(1095)]).optional(), targetCountryId: id.optional(), emergency: z.boolean().optional() })), loans: z.array(z.looseObject({ id, paidDay: day.optional(), earlyRepaid: z.boolean().optional(), defaultRecorded: z.boolean().optional() })) }).optional() }) });
/** All new fields are optional: schema-17 saves retain their identity and exact legacy contracts. */
export function valid0904Fields(value: unknown): boolean {
    const result = fields.safeParse(value);
    if (!result.success)
        return false;
    const s = result.data, e = s.world.expansion;
    if (!e)
        return true;
    return Object.entries(e.creditHistory ?? {}).every(([key, h]) => !!s.countries[key] && (h.lastRewardDay ?? 1) <= s.day)
        && (e.creditApplications ?? []).every(a => a.createdDay <= s.day && a.decisionDay === a.createdDay + 3 && a.borrowerId !== a.lenderId && [a.borrowerId, a.lenderId].includes(a.actorId) && [a.actorId, a.borrowerId, a.lenderId].every(key => !!s.countries[key]))
        && new Set((e.creditApplications ?? []).map(a => a.id)).size === (e.creditApplications ?? []).length
        && e.creditOffers.every(o => !o.targetCountryId || !!s.countries[o.targetCountryId]) && e.loans.every(l => (l.paidDay ?? 1) <= s.day);
}
