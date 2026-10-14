import {z} from 'zod';

const id=z.string().min(1),day=z.number().int().nonnegative();
const influence=z.number().finite().min(0).max(100);
const institution=z.enum(['un','who','security']);
const religion=z.enum(['christianity','catholic_christianity','orthodox_christianity','protestant_christianity','islam','hinduism','buddhism','judaism','unaffiliated','folk_or_mixed']);
const countryIds=z.array(id).refine(ids=>new Set(ids).size===ids.length);
const ballot=z.object({
 id,kind:z.enum(['membership','attack']),institution,proposerId:id,targetId:id,
 openedDay:day,closesDay:day,votes:z.record(id,z.enum(['yes','no','abstain'])),
 status:z.enum(['open','passed','rejected']),condemned:z.boolean().optional(),
}).refine(b=>b.closesDay>b.openedDay&&(b.kind!=='attack'||b.institution==='un'));
const mission=z.object({
 id,targetId:id,religion,startedDay:day,endsDay:day,chance:z.number().finite().min(0).max(1),
 status:z.enum(['active','success','failed']),effect:z.number().finite().min(0).max(100),
}).refine(m=>m.endsDay>m.startedDay);
const councilResolution=z.object({
 id,type:z.enum(['sanctions','ceasefire','humanitarian_aid']),proposerId:id,targetCountryId:id,
 supportPercent:influence,passed:z.boolean(),day,summary:z.string(),
});

/** Validate the institution data dereferenced by the engine, including country references. */
export const institutionWorld=z.looseObject({
 members:z.object({un:countryIds,who:countryIds,security:countryIds}),
 ballots:z.array(ballot),missions:z.array(mission),
 religiousShares:z.record(id,z.partialRecord(religion,influence)),
 lastAiProposalDay:day.optional(),
});
export const institutionCouncil=z.looseObject({
 influenceByCountry:z.record(id,influence),history:z.array(councilResolution),
});

type InstitutionSave={day:number;countries:Record<string,unknown>;world:z.infer<typeof institutionWorld>;council:z.infer<typeof institutionCouncil>};
export function validInstitutionReferences(s:InstitutionSave):boolean {
 const known=(id:string)=>Object.hasOwn(s.countries,id);
 return Object.values(s.world.members).every(ids=>ids.every(known))
  && Object.keys(s.world.religiousShares).every(known)
  && Object.keys(s.council.influenceByCountry).every(known)
  && (s.world.lastAiProposalDay??0)<=s.day
  && s.world.ballots.every(b=>known(b.proposerId)&&known(b.targetId)&&Object.keys(b.votes).every(known)&&b.openedDay<=s.day)
  && s.world.missions.every(m=>known(m.targetId)&&m.startedDay<=s.day)
  && s.council.history.every(r=>known(r.proposerId)&&known(r.targetCountryId)&&r.day<=s.day);
}
