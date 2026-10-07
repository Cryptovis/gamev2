export type CampusKind = "university" | "institute" | "academy";
export interface NationalAcademy {
  buildings: Record<CampusKind, number>;
  projects: Array<{ id: string; kind: CampusKind; readyDay: number }>;
  pilots: number;
  training: Array<{ id: string; count: number; readyDay: number }>;
  lastUpkeep: number;
  funded: boolean;
}
export interface Occupation {
  controllerId: string;
  unrest: number;
  policy: "civil" | "military";
  lastActionDay: number;
  election?: {
    endsDay: number;
    supported: string | null;
    winner?: string;
    resolved: boolean;
    offerAccepted: boolean;
  };
}
export interface PoliticalCampaign {
  id: string;
  targetId: string;
  endsDay: number;
  status: "active" | "success" | "failed";
  chance: number;
}
export interface GovernanceState {
  academies: Record<string, NationalAcademy>;
  occupations: Record<string, Occupation>;
  campaigns: PoliticalCampaign[];
  foreignLeaders: Record<string, string>;
}
