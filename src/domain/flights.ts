/** 0.89 flights: diplomatic jets and cargo aircraft travelling between countries over campaign days. */
export type FlightKind = 'diplomatic' | 'cargo';

/** What a flight delivers on arrival. Payloads are applied by the engine once, on the arrival day. */
export type FlightPayload =
  | { type: 'goods'; countryId: string; good: import('./living').ExchangeGood; amount: number }
  | { type: 'relations'; aId: string; bId: string; amount: number }
  | { type: 'none' };

export interface Flight {
  id: string;
  kind: FlightKind;
  fromId: string;
  toId: string;
  departDay: number;
  arriveDay: number;
  /** Short English label, translated by the UI (e.g. "Diplomatic mission", "Oil cargo"). */
  label: string;
  payload: FlightPayload;
  status: 'enroute' | 'landed';
  /** Phase 4: links a commodity cargo to its exchange delivery; the exchange books the position when this flight lands. */
  shipmentId?: string;
  /** Phase 4: goods landed and goods intercepted by a blockade, recorded on landing (absent before landing and in older saves). */
  delivered?: number;
  lost?: number;
}
