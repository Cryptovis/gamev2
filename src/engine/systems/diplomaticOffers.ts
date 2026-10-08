import {activeCountries} from '../../domain/sovereignty';
import { living, withLiving, resolveIncomingLetter } from "./livingEconomy";
import type { DiplomaticOffer, GameState } from "../../domain/game";
import {
  addTreaty,
  changeRelations,
  openEmbassy,
  relationFor,
  relationshipIndex,
} from "./diplomacy";

function stableHash(value: string) {
  let h = 2166136261;
  for (const ch of value) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function processIncomingDiplomaticOffers(state: GameState): GameState {
  if (
    state.day % 14 !== 0 ||
    state.diplomaticOffers.filter((o) => o.expiresDay >= state.day).length +
      living(state).letters.filter(
        (x) =>
          x.incoming && x.status === "pending" && x.expiresDay >= state.day,
      ).length >=
      3
  )
    return state;
  const player = state.countries[state.playerCountryId];
  if (!player) return state;
  const candidates = activeCountries(state.countries)
    .filter(
      (c) => c.id !== player.id && !c.controllerCountryId && !c.globalSanctions,
    )
    .map((c) => ({ country: c, relation: relationFor(player, c.id) }))
    .filter(
      (x) =>
        x.relation.status !== "war" &&
        !x.relation.sanctions &&
        (relationshipIndex(x.relation) >= 48 ||
          x.country.resources.food < 25 ||
          x.country.resources.oil < 15),
    )
    .sort(
      (a, b) => relationshipIndex(b.relation) - relationshipIndex(a.relation),
    );
  if (!candidates.length) return state;

  const offset =
    stableHash(`${state.day}-${player.id}-offer`) % candidates.length;
  const picked = candidates[offset];
  const relation = picked.relation;
  const embassyKey = [player.id, picked.country.id].sort().join("::");
  const hasEmbassy = Boolean(state.embassies[embassyKey]);
  const hasTrade = relation.treaties.includes("trade");
  const roll = stableHash(`${picked.country.id}-${state.day}`) % 100;
  let offer: DiplomaticOffer | null = null;

  if (!hasEmbassy && roll < 38) {
    offer = {
      id: `OFFER-EMB-${picked.country.id}-${state.day}`,
      type: "embassy",
      senderId: picked.country.id,
      receiverId: player.id,
      createdDay: state.day,
      expiresDay: state.day + 30,
      message: `${picked.country.name} proposes opening reciprocal embassies to deepen political, commercial and diplomatic access.`,
    };
  } else if (
    !hasTrade &&
    (relationshipIndex(relation)>=20 && (relationshipIndex(relation) > 50 ||
      picked.country.resources.food < 25 ||
      picked.country.resources.oil < 15)) &&
    roll < 72
  ) {
    offer = {
      id: `OFFER-TRD-${picked.country.id}-${state.day}`,
      type: "trade_pact",
      senderId: picked.country.id,
      receiverId: player.id,
      createdDay: state.day,
      expiresDay: state.day + 24,
      message: `${picked.country.name} proposes a bilateral trade framework and lower-friction commercial access.`,
    };
  }
  if (
    offer &&
    (living(state).letters.some(
      (x) =>
        x.status === "pending" &&
        x.kind === offer!.type &&
        [x.senderId, x.receiverId].includes(offer!.senderId),
    ) ||
      state.diplomaticOffers.some(
        (x) =>
          x.type === offer!.type &&
          x.senderId === offer!.senderId &&
          x.expiresDay >= state.day,
      ))
  )
    offer = null;
  if (!offer)
    return {
      ...state,
      diplomaticOffers: state.diplomaticOffers.filter(
        (o) => o.expiresDay >= state.day,
      ),
    };
  return {
    ...state,
    diplomaticOffers: [
      ...state.diplomaticOffers.filter((o) => o.expiresDay >= state.day),
      offer,
    ],
    sitrep: [
      `DIPLOMATIC OFFER // ${picked.country.name}: ${offer.type === "embassy" ? "Embassy exchange" : "Trade pact"} proposal received.`,
      ...state.sitrep,
    ].slice(0, 12),
  };
}

export function resolveDiplomaticOffer(
  state: GameState,
  offerId: string,
  accept: boolean,
): GameState {
  const offer = state.diplomaticOffers.find((o) => o.id === offerId);
  if (!offer) return resolveIncomingLetter(state, offerId, accept);
  const l = living(state),
    n = withLiving(state, {
      ...l,
      letters: [
        {
          id: offer.id,
          kind: offer.type,
          senderId: offer.senderId,
          receiverId: offer.receiverId,
          sentDay: offer.createdDay,
          replyDay: offer.createdDay,
          expiresDay: offer.expiresDay,
          status: "pending",
          incoming: true,
          years: 1,
          message: offer.message,
          read: false,
        },
        ...l.letters,
      ],
    });
  const resolved = resolveIncomingLetter(n, offerId, accept);
  if (resolved === n) return state;
  return {
    ...resolved,
    diplomaticOffers: resolved.diplomaticOffers.filter((o) => o.id !== offerId),
  };
}
