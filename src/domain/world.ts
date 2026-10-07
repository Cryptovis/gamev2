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
 governance?:GovernanceState;
 programs?:Array<{id:string;kind:'jobs'|'education'|'health';readyDay:number;status:'active'|'completed'}>;
  members: Record<InstitutionId, string[]>;
  ballots: WorldBallot[];
  missions: OutreachMission[];
  religiousShares: Record<string, Partial<Record<ReligionType, number>>>;
  tutorial: { active: boolean; step: number; completed: boolean };
  lastAiProposalDay: number;
}
