import type {NationalEnergy} from './energy';
import type {ExpansionState} from './expansion';
import type {LivingWorld} from './living';
import type {GovernanceState} from "./governance";
import type { ReligionType } from "./game";
export type InstitutionId = "un" | "who" | "security";
export type VoteChoice = "yes" | "no" | "abstain";
export interface WorldBallot {
  id: string;
  kind: "membership" | "attack";
  institution: InstitutionId;
  proposerId: string;
  targetId: string;
  openedDay: number;
  closesDay: number;
  votes: Record<string, VoteChoice>;
  status: "open" | "passed" | "rejected";
  condemned?: boolean;
}
export interface OutreachMission {
  id: string;
  targetId: string;
  religion: ReligionType;
  startedDay: number;
  endsDay: number;
  chance: number;
  status: "active" | "success" | "failed";
  effect: number;
}
export interface WorldState {
 organizations:import('./organizations').OrganizationsState;
 economicHistory?:import('../engine/systems/economicHistory').EconomicHistory;
 campaignId?:string;
 commandIds?:string[];
 journal?:Array<{id:string;day:number;message:string;kind:'command'|'world'|'legacy'}>;
 energy?:Record<string,NationalEnergy>;
 expansion?:ExpansionState;
 living?:LivingWorld;
 governance?:GovernanceState;
 programs?:Array<{id:string;kind:'jobs'|'education'|'health';readyDay:number;status:'active'|'completed';strength?:number}>;
 /** 0.87 repeat fatigue and cooldowns per `countryId|action` (policyPressure.ts); absent in older saves. */
 actionFatigue?:Record<string,{value:number;day:number}>;
 /** 0.88 campaign victory tracking (campaignVictory.ts); absent in older saves. */
 campaign?:import('./campaign').CampaignProgress;
 /** 0.89 diplomatic and cargo flights (flights.ts); absent in older saves. */
 flights?:import('./flights').Flight[];
 /** 0.89 commodity exchange (commodityExchange.ts); absent in older saves and created on the next tick. */
 commodities?:import('./commodityExchange').CommodityExchangeState;
 /** 9.6 peace conferences, signed treaties and standing clauses (peaceTreaty.ts); absent in older saves. */
 peace?:import('./peace').PeaceState;
 /** 9.7 enrichment programmes, strategic forces and IAEA records (nuclear.ts); absent in older saves. */
 nuclear?:import('./nuclear').NuclearState;
 /** 9.8 parliament seats, coalitions and strikes (parliament.ts); absent in older saves and created on the next tick. */
 parliament?:import('./parliament').ParliamentState;
 /** 9.9 the cloud revision this save descends from (lineage.ts); absent until the campaign is synced. */
 lineage?:import('./lineage').SaveLineage;
  members: Record<InstitutionId, string[]>;
  ballots: WorldBallot[];
  missions: OutreachMission[];
  religiousShares: Record<string, Partial<Record<ReligionType, number>>>;
  tutorial: { active: boolean; step: number; completed: boolean; practiceProjectId?:string };
  lastAiProposalDay: number;
}
