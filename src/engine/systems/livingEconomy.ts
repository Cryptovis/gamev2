import {activeCountries} from '../../domain/sovereignty';
import type { CountryState, GameState, TradeResource } from "../../domain/game";
import type {
  ActivityKind,
  AdviceKind,
  ExchangeGood,
  LivingWorld,
  DiplomaticLetter,
} from "../../domain/living";
import { GOODS } from "../../data/industrialCatalog";
import { REPORTED_GOLD } from "../../data/preciousMetals";
import { goodStock, changeGoodStock } from "./industrialEconomy";
import {
  industrialPrice,
  canTradeIndustrial,
  tankDomesticCost,
} from "./industrialMarket";
import { getGlobalMarketPrice } from "./trade";
import {
  closeEmbassy,
  embassyFor,
  relationshipIndex,
  relationFor,
} from "./diplomacy";
import { AGREEMENT_BASE_COST, agreementAcceptanceChance, agreementCost, concludeAgreement, TRADE_MIN_INDEX } from "./treaties";
import { nextRandom } from "../rng";
import { actionEffectMultiplier, headroomFactor, publicGain, recordActionUse, scaledCostB } from "./policyPressure";
import { calculateSupplyNetwork } from "./supplyNetwork";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const raw = (g: ExchangeGood): g is TradeResource =>
  ["food", "oil", "iron", "uranium"].includes(g);
export const EXCHANGE_GOODS: ExchangeGood[] = [
  "food",
  "oil",
  "iron",
  "uranium",
  ...(Object.keys(GOODS) as Array<keyof typeof GOODS>),
];
export function createLiving(
  countries: Record<string, CountryState>,
): LivingWorld {
  return {
    listings: [],
    letters: [],
    bankGold: Object.fromEntries(
      Object.values(countries).map((c) => [
        c.id,
        {
          tonnes:
            REPORTED_GOLD[c.id] ??
            Math.round(Math.max(0.1, c.economy.gdp * 0.045) * 100) / 100,
          confidence:
            REPORTED_GOLD[c.id] !== undefined ? "reported" : "game-estimate",
          asOf:
            REPORTED_GOLD[c.id] !== undefined ? "2026-08-31" : "game opening",
        },
      ]),
    ),
    activities: [],
    advice: { suppressed: [], lastShown: {}, active: null },
  };
}
function retainLetters(letters: DiplomaticLetter[]) {
  return [
    ...letters.filter((x) => x.status === "pending"),
    ...letters.filter((x) => x.status !== "pending").slice(0, 150),
  ];
}
export const living = (s: GameState) =>
  s.world.living ?? createLiving(s.countries);
export function withLiving(s: GameState, l: LivingWorld): GameState {
  return { ...s, world: { ...s.world, living: l } };
}
export function exchangeStock(s: GameState, id: string, g: ExchangeGood) {
  return raw(g) ? (s.countries[id]?.resources[g] ?? 0) : goodStock(s, id, g);
}
export function changeExchangeStock(
  s: GameState,
  id: string,
  g: ExchangeGood,
  delta: number,
): GameState {
  if (!raw(g)) return changeGoodStock(s, id, g, delta);
  const c = s.countries[id];
  return {
    ...s,
    countries: {
      ...s.countries,
      [id]: {
        ...c,
        resources: { ...c.resources, [g]: Math.max(0, c.resources[g] + delta) },
      },
    },
  };
}
export function exchangePrice(s: GameState, g: ExchangeGood) {
  return raw(g) ? getGlobalMarketPrice(s, g) : industrialPrice(s, g);
}
export function exportableStock(s: GameState, id: string, g: ExchangeGood) {
  const c = s.countries[id];
  if (!c) return 0;
  const reserve = raw(g)
    ? g === "food"
      ? Math.max(20, (c.demographics.population / 1e6) * 1.2)
      : g === "oil"
        ? Math.max(18, c.military.readiness * 0.22)
        : g === "iron"
          ? Math.max(20, c.industry.factories * 2.2)
          : 0.5
    : GOODS[g].reserve;
  return Math.max(0, exchangeStock(s, id, g) - reserve);
}
export function exchangeAccess(
  s: GameState,
  seller: string,
  buyer: string,
  g: ExchangeGood,
) {
  const a = s.countries[seller],
    b = s.countries[buyer];
  if (!a || !b || seller === buyer) return false;
  if (!raw(g)) return canTradeIndustrial(s, seller, buyer, g);
  const rel = relationFor(b, seller);
  return (
    !a.globalSanctions &&
    !b.globalSanctions &&
    !rel.sanctions &&
    rel.status !== "war" &&
    rel.treaties.includes("trade")
  );
}
export function postListing(
  s: GameState,
  g: ExchangeGood,
  quantity: number,
  price: number,
  seller = s.playerCountryId,
): GameState {
  const l = living(s);
  if (
    !EXCHANGE_GOODS.includes(g) ||
    !s.countries[seller] ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(price) ||
    price <= 0 ||
    quantity > exportableStock(s, seller, g) + 1e-8 ||
    l.listings.filter((x) => x.status === "open" && x.sellerId === seller)
      .length >= 12
  )
    return s;
  let serial = l.listings.length;
  while (
    l.listings.some((x) => x.id === `listing-${seller}-${s.day}-${serial}`)
  )
    serial++;
  const listing = {
    id: `listing-${seller}-${s.day}-${serial}`,
    sellerId: seller,
    good: g,
    remaining: quantity,
    originalQuantity: quantity,
    unitPrice: price,
    createdDay: s.day,
    expiresDay: s.day + 60,
    status: "open" as const,
  };
  return withLiving(changeExchangeStock(s, seller, g, -quantity), {
    ...l,
    listings: [listing, ...l.listings],
  });
}
export function cancelListing(
  s: GameState,
  id: string,
  expired = false,
): GameState {
  const l = living(s),
    x = l.listings.find((x) => x.id === id);
  if (
    !x ||
    x.status !== "open" ||
    (!expired && x.sellerId !== s.playerCountryId)
  )
    return s;
  return withLiving(changeExchangeStock(s, x.sellerId, x.good, x.remaining), {
    ...l,
    listings: l.listings.map((v) =>
      v.id === id
        ? { ...v, remaining: 0, status: expired ? "expired" : "cancelled" }
        : v,
    ),
  });
}
export function buyListing(
  s: GameState,
  id: string,
  quantity: number,
  buyer = s.playerCountryId,
): GameState {
  const l = living(s),
    x = l.listings.find((x) => x.id === id);
  if (
    !x ||
    x.status !== "open" ||
    x.expiresDay < s.day ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > x.remaining + 1e-8 ||
    !exchangeAccess(s, x.sellerId, buyer, x.good)
  )
    return s;
  const cost = quantity * x.unitPrice,
    b = s.countries[buyer],
    a = s.countries[x.sellerId];
  if (!Number.isFinite(cost) || b.economy.treasury < cost) return s;
  let n = changeExchangeStock(s, buyer, x.good, quantity);
  n = {
    ...n,
    countries: {
      ...n.countries,
      [buyer]: {
        ...n.countries[buyer],
        economy: { ...b.economy, treasury: b.economy.treasury - cost },
      },
      [a.id]: {
        ...n.countries[a.id],
        economy: { ...a.economy, treasury: a.economy.treasury + cost },
      },
    },
  };
  const remaining = Math.max(0, x.remaining - quantity);
  return withLiving(n, {
    ...l,
    listings: l.listings.map((v) =>
      v.id === id
        ? { ...v, remaining, status: remaining < 1e-8 ? "sold" : "open" }
        : v,
    ),
  });
}
export function processExchange(s: GameState, seed = false): GameState {
  let n = s;
  for (const x of living(n).listings)
    if (x.status === "open" && x.expiresDay < n.day)
      n = cancelListing(n, x.id, true);
  // Listing and buying only move stock between sellers, listings and buyers (and treasury), which leaves
  // reference prices unchanged, so each good is priced once per call instead of once per listing.
  const prices = new Map<ExchangeGood, number>();
  const priceOf = (good: ExchangeGood) => {
    if (!prices.has(good)) prices.set(good, exchangePrice(n, good));
    return prices.get(good)!;
  };
  if (n.day % 7 === 0 || seed) {
    const countries = activeCountries(n.countries).filter(
        (c) => c.id !== s.playerCountryId && !c.globalSanctions,
      ),
      offset = Math.floor(n.day / 7) * 28;
    for (let i = 0; i < Math.min(28, countries.length); i++) {
      const c = countries[(offset + i) % countries.length];
      for (const good of EXCHANGE_GOODS) {
        if (living(n).listings.filter((x) => x.status === "open").length >= 300)
          break;
        if (
          living(n).listings.some(
            (x) =>
              x.sellerId === c.id && x.good === good && x.status === "open",
          )
        )
          continue;
        const excess = exportableStock(n, c.id, good);
        if (excess <= 0.001) continue;
        const modifier = c.economy.treasury < 5 ? 0.8 : 0.92 + (i % 6) * 0.035;
        n = postListing(
          n,
          good,
          Math.min(
            excess * 0.25,
            good === "gold" ? 0.2 : good === "tanks" ? 10 : 20,
          ),
          Math.max(
            priceOf(good) * modifier,
            good === "tanks" ? tankDomesticCost(n, c.id) * 1.35 : 0,
          ),
          c.id,
        );
        if (living(n).listings.filter((x) => x.status === "open").length >= 300)
          break;
      }
      if (living(n).listings.filter((x) => x.status === "open").length >= 300)
        break;
    }
  }
  if (!seed && n.day % 7 === 0) {
    for (const c of activeCountries(n.countries)) {
      if (c.id === s.playerCountryId) continue;
      for (const good of [
        "food",
        "oil",
        "water",
        "engines",
        "electronics",
        "gold",
        "silver",
      ] as ExchangeGood[]) {
        const target = raw(good)
          ? good === "food"
            ? Math.max(20, c.demographics.population / 1e6)
            : 20
          : GOODS[good].reserve * 2;
        if (exchangeStock(n, c.id, good) >= target) continue;
        const x = living(n)
          .listings.filter(
            (x) =>
              x.good === good &&
              x.status === "open" &&
              exchangeAccess(n, x.sellerId, c.id, good) &&
              x.unitPrice <= priceOf(good) * 1.15,
          )
          .sort(
            (a, b) => a.unitPrice - b.unitPrice || a.id.localeCompare(b.id),
          )[0];
        if (x) {
          const quantity = Math.min(
            x.remaining,
            target - exchangeStock(n, c.id, good),
            (Math.max(0, n.countries[c.id].economy.treasury) * 0.02) /
              x.unitPrice,
          );
          if (quantity > 1e-6) n = buyListing(n, x.id, quantity, c.id);
        }
      }
    }
  }
  const l = living(n);
  return withLiving(n, {
    ...l,
    listings: [
      ...l.listings.filter((x) => x.status === "open"),
      ...l.listings.filter((x) => x.status !== "open").slice(0, 100),
    ],
  });
}
export function moveBankGold(
  s: GameState,
  tonnes: number,
  direction: "release" | "deposit",
): GameState {
  const l = living(s),
    v = l.bankGold[s.playerCountryId];
  if (
    !v ||
    !Number.isFinite(tonnes) ||
    tonnes <= 0 ||
    tonnes >
      (direction === "release"
        ? v.tonnes
        : goodStock(s, s.playerCountryId, "gold"))
  )
    return s;
  return withLiving(
    changeGoodStock(
      s,
      s.playerCountryId,
      "gold",
      direction === "release" ? tonnes : -tonnes,
    ),
    {
      ...l,
      bankGold: {
        ...l.bankGold,
        [s.playerCountryId]: {
          ...v,
          tonnes: v.tonnes + (direction === "release" ? -tonnes : tonnes),
        },
      },
    },
  );
}
export const ACTIVITIES = {
  festival: {
    title: "National Festival",
    cost: 0.2,
    days: 7,
    approval: 0.5,
    cohesion: 0.15,
  },
  sports: {
    title: "National Sports Games",
    cost: 0.35,
    days: 14,
    approval: 0.3,
    cohesion: 0.2,
  },
  food_relief: {
    title: "Food Relief Campaign",
    cost: 0.15,
    days: 7,
    approval: 0.35,
    cohesion: 0.1,
  },
};
/** GDP-scaled cost (audit C15); `ACTIVITIES[kind].cost` is the reference-economy base. */
export function activityCost(s: GameState, kind: ActivityKind, countryId = s.playerCountryId): number {
  return scaledCostB(s.countries[countryId], ACTIVITIES[kind].cost);
}
/** Dialog preview: scaled cost, repeat-fatigue multiplier and the approval gain expected at today's approval. */
export function activityPreview(s: GameState, kind: ActivityKind) {
  const c = s.countries[s.playerCountryId], d = ACTIVITIES[kind];
  const multiplier = actionEffectMultiplier(s, c.id, `activity/${kind}`);
  return { cost: activityCost(s, kind), multiplier, approvalGain: d.approval * d.days * multiplier * headroomFactor(c.politics.approval) };
}
export function startActivity(s: GameState, kind: ActivityKind): GameState {
  const d = ACTIVITIES[kind],
    c = s.countries[s.playerCountryId],
    l = living(s),
    cost = d ? activityCost(s, kind) : 0;
  if (
    !d ||
    c.economy.treasury < cost ||
    l.activities.some((x) => x.kind === kind && s.day < x.endsDay + 30) ||
    (kind === "food_relief" && c.resources.food < 20)
  )
    return s;
  const n = {
    ...s,
    countries: {
      ...s.countries,
      [c.id]: {
        ...c,
        economy: { ...c.economy, treasury: c.economy.treasury - cost },
        resources: {
          ...c.resources,
          food: c.resources.food - (kind === "food_relief" ? 20 : 0),
        },
      },
    },
  };
  // Repeat fatigue (audit C4): festivals, games and relief share one public-attention pool.
  const strength = actionEffectMultiplier(s, c.id, `activity/${kind}`);
  return recordActionUse(withLiving(n, {
    ...l,
    activities: [
      {
        id: `${kind}-${s.day}`,
        kind,
        startedDay: s.day,
        endsDay: s.day + d.days,
        lastAppliedDay: s.day,
        strength,
      },
      ...l.activities,
    ].slice(0, 80),
  }), c.id, `activity/${kind}`);
}
export function recruitPersonnel(s: GameState, count: number): GameState {
  const c = s.countries[s.playerCountryId],
    civil = Math.max(0, c.demographics.population - c.military.personnel),
    cost = count * 0.000025;
  if (
    !Number.isInteger(count) ||
    count <= 0 ||
    count > 100000 ||
    count > civil * 0.01 ||
    c.economy.treasury < cost
  )
    return s;
  return {
    ...s,
    countries: {
      ...s.countries,
      [c.id]: {
        ...c,
        economy: { ...c.economy, treasury: c.economy.treasury - cost },
        demographics: {
          ...c.demographics,
          workforce: Math.max(
            0,
            c.demographics.workforce - Math.round(count * 0.4),
          ),
        },
        military: {
          ...c.military,
          personnel: c.military.personnel + count,
          readiness: Math.max(0, c.military.readiness - 2),
        },
      },
    },
  };
}
export function dismissAdvice(
  s: GameState,
  kind: AdviceKind,
  disable = false,
): GameState {
  const l = living(s);
  return withLiving(s, {
    ...l,
    advice: {
      ...l.advice,
      active: null,
      suppressed: disable
        ? [...new Set([...l.advice.suppressed, kind])]
        : l.advice.suppressed,
      lastShown: { ...l.advice.lastShown, [kind]: s.day },
    },
  });
}
export function restoreAdvice(s: GameState): GameState {
  const l = living(s);
  return withLiving(s, {
    ...l,
    advice: { active: null, suppressed: [], lastShown: {} },
  });
}
export function processWellbeing(s: GameState): GameState {
  const l = living(s);
  let c = s.countries[s.playerCountryId];
  const activities = l.activities.map((x) => {
    if (s.day <= x.startedDay || s.day > x.endsDay || x.lastAppliedDay >= s.day)
      return x;
    const d = ACTIVITIES[x.kind], m = x.strength ?? 1;
    c = {
      ...c,
      politics: {
        ...c.politics,
        approval: publicGain(c.politics.approval, d.approval, m),
      },
      society: {
        ...c.society,
        cohesion: publicGain(c.society.cohesion, d.cohesion, m),
      },
    };
    return { ...x, lastAppliedDay: s.day };
  });
  let n = withLiving(
    { ...s, countries: { ...s.countries, [c.id]: c } },
    { ...l, activities },
  );
  if (
    s.activeAdvisor ||
    s.activeEvent ||
    s.world.tutorial.active ||
    l.advice.active ||
    l.notice
  )
    return n;
  const war = Object.values(s.wars).some(
      (w) =>
        w.status === "active" &&
        (w.attackerId === c.id || w.defenderId === c.id),
    ),
    fuel = calculateSupplyNetwork(c).fuelDays;
  const candidates: AdviceKind[] = [
    ...(war && fuel < 3 ? ["fuel" as const] : []),
    ...(c.politics.approval < 40 ? ["approval" as const] : []),
    ...(c.demographics.growthRate < 0 ? ["population" as const] : []),
    ...(c.resources.food < 5 ? ["food" as const] : []),
    ...(c.economy.inflation > 15 ? ["inflation" as const] : []),
  ];
  const kind = candidates.find(
    (k) =>
      !l.advice.suppressed.includes(k) &&
      s.day - (l.advice.lastShown[k] ?? -100) >= 20,
  );
  if (kind)
    n = withLiving(
      { ...n, speed: 0 },
      {
        ...living(n),
        advice: {
          ...l.advice,
          active: kind,
          lastShown: { ...l.advice.lastShown, [kind]: s.day },
        },
      },
    );
  return n;
}
export const LETTER_COST = { embassy: AGREEMENT_BASE_COST.embassy, trade_pact: AGREEMENT_BASE_COST.trade, closure: 0 };
/** Fee a country pays for a letter agreement: the shared GDP-scaled treaty fee (audit D8). */
export const letterCost=(s:GameState,countryId:string,kind:DiplomaticLetter['kind'])=>kind==='closure'?0:agreementCost(s,countryId,kind==='trade_pact'?'trade':'embassy');
export function proposalAcceptanceChance(s:GameState,senderId:string,targetId:string,kind:'embassy'|'trade_pact'){
 return agreementAcceptanceChance(s,senderId,targetId,kind==='trade_pact'?'trade':'embassy');
}
export function diplomaticProposalStatus(s:GameState,targetId:string,kind:'embassy'|'trade_pact') {
 const p=s.countries[s.playerCountryId],t=s.countries[targetId];
 if(!t||p.id===targetId)return {allowed:false,reason:'Choose another country.'};
 const relation=relationFor(p,targetId);
 if(kind==='embassy'?!!embassyFor(s,p.id,targetId):relation.treaties.includes('trade'))return {allowed:false,reason:'This agreement is already active. Open partner diplomacy to inspect it.'};
 const letter=living(s).letters.find(x=>x.kind===kind&&(x.incoming?x.senderId===targetId&&x.receiverId===p.id&&x.status==='pending':x.senderId===p.id&&x.receiverId===targetId&&(x.status==='pending'||s.day<x.replyDay+14)));
 if(letter)return {allowed:false,letter,reason:letter.incoming?'An incoming proposal is waiting. Review Received proposals instead of sending another.':letter.status==='pending'?'Proposal already sent. Wait for the reply; repeating it will not speed up the answer or charge another fee.':'A recent proposal is still on cooldown. Check its result in the proposal tracker.',retryDay:letter.replyDay+14};
 if(relation.status==='war'||p.globalSanctions||t.globalSanctions||relation.sanctions)return {allowed:false,reason:'War or sanctions prevent this proposal. Open partner diplomacy to inspect access.'};
 if(kind==='trade_pact'&&relationshipIndex(relation)<TRADE_MIN_INDEX)return {allowed:false,reason:'Trade proposals require relations of at least 20/100. Improve relations through diplomatic missions or aid; above 50/100, acceptance becomes easier.'};
 if(p.economy.treasury<letterCost(s,p.id,kind))return {allowed:false,reason:'Insufficient treasury for the fee if accepted.'};
 return {allowed:true,reason:'The reply arrives after three campaign days. Payment is charged only if accepted.'};
}
export function requestDiplomacy(
  s: GameState,
  targetId: string,
  kind: "embassy" | "trade_pact",
  years: 1 | 3 | 5 | 10 = 1,
): GameState {
  const p = s.countries[s.playerCountryId],
    t = s.countries[targetId],
    l = living(s);
  const status=diplomaticProposalStatus(s,targetId,kind);
  if(!status.allowed)return s;
  if (
    !t ||
    p.id === t.id ||
    ![1, 3, 5, 10].includes(years) ||
    relationFor(p, t.id).status === "war" ||
    p.globalSanctions ||
    t.globalSanctions ||
    relationFor(p, t.id).sanctions ||
    l.letters.some(
      (x) =>
        !x.incoming &&
        x.receiverId === t.id &&
        x.kind === kind &&
        (x.status === "pending" || s.day < x.replyDay + 14),
    ) ||
    (kind === "embassy"
      ? !!embassyFor(s, p.id, t.id)
      : relationFor(p, t.id).treaties.includes("trade")) ||
    p.economy.treasury < letterCost(s, p.id, kind)
  )
    return s;
  const x: DiplomaticLetter = {
    id: `letter-${kind}-${t.id}-${s.day}-${l.letters.length}`,
    senderId: p.id,
    receiverId: t.id,
    kind,
    sentDay: s.day,
    replyDay: s.day + 3,
    expiresDay: s.day + 30,
    status: "pending",
    incoming: false,
    years,
    message:
      "Proposal sent. The partner will assess relations and strategic needs in three days. Payment is charged only if accepted.",
    read: true,
  };
  return withLiving(s, { ...l, letters: retainLetters([x, ...l.letters]) });
}
function enactLetter(
  s: GameState,
  x: DiplomaticLetter,
  costShare: number,
): GameState {
  // costShare is the player's part of the fee; the shared treaty rules check eligibility and both treasuries.
  if (x.kind === "closure") return s;
  const proposerShare = x.senderId === s.playerCountryId ? costShare : 1 - costShare;
  return concludeAgreement(s, x.senderId, x.receiverId, x.kind === "trade_pact" ? "trade" : "embassy", proposerShare);
}
export function resolveIncomingLetter(
  s: GameState,
  id: string,
  accept: boolean,
): GameState {
  const l = living(s),
    x = l.letters.find((x) => x.id === id);
  if (
    !x ||
    !x.incoming ||
    x.status !== "pending" ||
    x.expiresDay < s.day ||
    x.receiverId !== s.playerCountryId ||
    x.kind === "closure"
  )
    return s;
  const rel = relationFor(s.countries[x.senderId], x.receiverId);
  if (accept && (rel.status === "war" || rel.sanctions)) return s;
  const n = accept ? enactLetter(s, x, 0.5) : s;
  if (accept && n === s) return s;
  return withLiving(n, {
    ...living(n),
    letters: living(n).letters.map((v) =>
      v.id === id
        ? { ...v, status: accept ? "accepted" : "rejected", read: true }
        : v,
    ),
  });
}
export function processLetters(s: GameState): GameState {
  let n = s;
  for (const x of living(s).letters) {
    if (x.status !== "pending") continue;
    if (x.incoming) {
      if (x.expiresDay < s.day)
        n = withLiving(n, {
          ...living(n),
          letters: living(n).letters.map((v) =>
            v.id === x.id ? { ...v, status: "expired" } : v,
          ),
        });
      continue;
    }
    if (x.replyDay > s.day) continue;
    const p = n.countries[x.senderId],
      t = n.countries[x.receiverId],
      rel = relationFor(p, t.id),
      chance = proposalAcceptanceChance(n,p.id,t.id,x.kind==='trade_pact'?'trade_pact':'embassy');
    const { seed, value: roll } = nextRandom(n.simulationSeed);
    n = { ...n, simulationSeed: seed };
    const applied = roll < chance ? enactLetter(n, x, 1) : n,
      accepted = applied !== n;
    n = withLiving(applied, {
      ...living(applied),
      letters: living(applied).letters.map((v) =>
        v.id === x.id
          ? {
              ...v,
              status: accepted ? "accepted" : "rejected",
              message: accepted
                ? "Proposal accepted. The agreement is now active; diplomatic costs have been paid."
                : (rel.status==='war'||rel.sanctions||p.globalSanctions||t.globalSanctions?'Proposal declined because war or sanctions block diplomatic access.':p.economy.treasury<letterCost(n,p.id,x.kind)?'Proposal declined because your treasury cannot pay the acceptance fee.':x.kind==='trade_pact'&&relationshipIndex(rel)<TRADE_MIN_INDEX?'Proposal declined because relations fell below 20/100. Improve relations through missions or aid.':'The partner declined on strategic interest. Improve relations above 50/100 for easier trade acceptance; approval remains probabilistic.'),
              read: false,
            }
          : v,
      ),
    });
  }
  // Convert legacy/new incoming offers into retained, readable letters.
  for (const x of n.diplomaticOffers) {
    if (living(n).letters.some((v) => v.id === x.id)) continue;
    n = withLiving(n, {
      ...living(n),
      letters: retainLetters([
        {
          id: x.id,
          kind: x.type,
          senderId: x.senderId,
          receiverId: x.receiverId,
          sentDay: x.createdDay,
          replyDay: x.createdDay,
          expiresDay: x.expiresDay,
          status: "pending" as const,
          incoming: true,
          years: 1 as const,
          message: x.message,
          read: false,
        },
        ...living(n).letters,
      ]),
    });
  }
  n = { ...n, diplomaticOffers: [] };
  for (const e of Object.values(n.embassies)) {
    const rel = relationFor(n.countries[e.countryA], e.countryB);
    if (rel.status !== "war" && rel.score > -45) continue;
    const other = e.countryA === n.playerCountryId ? e.countryB : e.countryA;
    n = closeEmbassy(n, e.countryA, e.countryB);
    if (e.countryA !== n.playerCountryId && e.countryB !== n.playerCountryId)
      continue;
    const l = living(n),
      letter: DiplomaticLetter = {
        id: `closure-${e.id}-${n.day}`,
        kind: "closure",
        senderId: other,
        receiverId: n.playerCountryId,
        sentDay: n.day,
        replyDay: n.day,
        expiresDay: n.day + 365,
        status: "closed",
        incoming: true,
        years: 1,
        message:
          "Diplomatic relations deteriorated. The partner has closed the reciprocal embassy.",
        read: false,
      };
    n = withLiving(n, { ...l, letters: retainLetters([letter, ...l.letters]) });
    n = withLiving(
      { ...n, speed: 0 },
      {
        ...living(n),
        notice: {
          title: "Embassy closed",
          summary:
            n.countries[other].name +
            ": diplomatic relations deteriorated. The embassy has closed. Review the letter in Diplomatic Inbox.",
        },
      },
    );
  }
  return n;
}
