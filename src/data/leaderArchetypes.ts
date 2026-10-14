import type {LeaderArchetype} from '../domain/industrial';
import {avatarPreset} from './avatarPresets';

export const LEADER_ARCHETYPES=['executive','reformer','diplomat','commander','chancellor','governor'] as const;
export const LEADER_PERKS:Record<LeaderArchetype,{role:string;title:string;description:string}>={
 executive:{role:'Executive',title:'Industrialist',description:'Factory output +10%; daily tax revenue +5%.'},
 reformer:{role:'Reformer',title:'Civil Harmonizer',description:'Stability recovery +10%; starting public approval +8%.'},
 diplomat:{role:'Diplomat',title:'Global Envoy',description:'Initial relations +15 with every nation; embassy setup cost −20%.'},
 commander:{role:'Commander',title:'Supreme Marshal',description:'Recruitment intake and military training speed +10%; defensive combat power +15%.'},
 chancellor:{role:'Chancellor',title:'Fiscal Architect',description:'Starting treasury +20%; daily debt interest −15%.'},
 governor:{role:'Governor',title:'Civic Planner',description:'Per-capita food and consumer water consumption −15%.'},
};
/** Other portraits inherit their style's role; canonical civilian portraits keep their distinct archetypes. */
export function portraitArchetype(avatarId:string):LeaderArchetype{
 const a=avatarPreset(avatarId);
 if(a.id==='avatar-02')return 'reformer';if(a.id==='avatar-03')return 'diplomat';
 if(a.id==='avatar-04')return 'governor';if(a.id==='avatar-05')return 'chancellor';
 return a.category==='military'||a.category==='aviator'?'commander':'executive';
}
