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
  members: Record<InstitutionId, string[]>;
  ballots: WorldBallot[];
  missions: OutreachMission[];
  religiousShares: Record<string, Partial<Record<ReligionType, number>>>;
  tutorial: { active: boolean; step: number; completed: boolean; practiceProjectId?:string };
  lastAiProposalDay: number;
}
