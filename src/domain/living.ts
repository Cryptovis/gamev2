import type { IndustrialGood } from "./industrial";
import type { TradeResource } from "./game";
export type ExchangeGood = IndustrialGood | TradeResource;
export type ActivityKind = "festival" | "sports" | "food_relief";
export type AdviceKind =
  "approval" | "population" | "fuel" | "food" | "inflation";
export interface ExchangeListing {
  id: string;
  sellerId: string;
  good: ExchangeGood;
  remaining: number;
  originalQuantity: number;
  unitPrice: number;
  createdDay: number;
  expiresDay: number;
  status: "open" | "sold" | "cancelled" | "expired";
}
export interface DiplomaticLetter {
  id: string;
  kind: "embassy" | "trade_pact" | "closure";
  senderId: string;
  receiverId: string;
  sentDay: number;
  replyDay: number;
  expiresDay: number;
  status: "pending" | "accepted" | "rejected" | "expired" | "closed";
  incoming: boolean;
  years: 1 | 3 | 5 | 10;
  message: string;
  read: boolean;
}
export interface LivingWorld {
  notice?: { title: string; summary: string } | null;
  listings: ExchangeListing[];
  letters: DiplomaticLetter[];
  bankGold: Record<
    string,
    { tonnes: number; confidence: "reported" | "game-estimate"; asOf: string }
  >;
  activities: Array<{
    id: string;
    kind: ActivityKind;
    startedDay: number;
    endsDay: number;
    lastAppliedDay: number;
    /** 0.87 share of the daily effect after repeat fatigue (1 when absent). */
    strength?: number;
  }>;
  advice: {
    suppressed: AdviceKind[];
    lastShown: Partial<Record<AdviceKind, number>>;
    active: AdviceKind | null;
  };
}
