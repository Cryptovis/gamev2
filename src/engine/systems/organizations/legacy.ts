import type {GameState} from '../../../domain/game';
import type {OrganizationState,Membership} from '../../../domain/organizations';

/** Completed legacy ballots update UN metadata without re-evaluating their old votes. */
export function reconcileLegacyMembershipChanges(before:GameState,after:GameState):GameState {
  if(before.world.members.un===after.world.members.un&&before.world.members.security===after.world.members.security)return after;
  const organizations=after.world.organizations;
  let un=organizations.byId.un;
  for(const [institution,bodyId] of [['un','legacyAssembly'],['security','legacySecurity']] as const){
    const added=after.world.members[institution].filter(id=>!before.world.members[institution].includes(id));
    for(const id of added){
      const old=un.memberships[id];
      const member:Membership={countryId:id,tier:old?.tier==='PermanentCouncil'?'PermanentCouncil':'Member',offices:old?.offices??[],status:'active',joinedDay:old?.joinedDay??after.day,duesArrearsB:old?.duesArrearsB??0};
      un={...un,memberships:{...un.memberships,[id]:member},bodies:{...un.bodies,plenary:{...un.bodies.plenary,memberIds:[...new Set([...un.bodies.plenary.memberIds,id])].sort()}}};
    }
    un={...un,bodies:{...un.bodies,[bodyId]:{...un.bodies[bodyId],memberIds:[...after.world.members[institution]]}}};
  }
  return {...after,world:{...after.world,organizations:{...organizations,byId:{...organizations.byId,un}}}};
}
/** New UN membership decisions mirror only the affected legacy roster entries. */
export function mirrorUnMembership(state:GameState,un:OrganizationState,targetId:string):GameState {
  const m=un.memberships[targetId],member=m?.status==='active'&&m.tier!=='Observer';
  const update=(ids:string[],add:boolean)=>add?[...new Set([...ids,targetId])]:ids.filter(id=>id!==targetId);
  const members={...state.world.members,un:update(state.world.members.un,member),security:member?state.world.members.security:update(state.world.members.security,false)};
  const bodies={...un.bodies};
  bodies.legacyAssembly={...bodies.legacyAssembly,memberIds:[...members.un]};
  bodies.legacySecurity={...bodies.legacySecurity,memberIds:[...members.security]};
  const organizations=state.world.organizations;
  return {...state,world:{...state.world,members,organizations:{...organizations,byId:{...organizations.byId,un:{...un,bodies}}}}};
}
