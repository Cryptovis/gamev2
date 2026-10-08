import { activeCountries } from "../../domain/sovereignty";
import type { GameState } from "../../domain/game";
import type {
  ExpansionState,
  CreditOffer,
  SovereignLoan,
} from "../../domain/expansion";
import {
  living,
  withLiving,
  EXCHANGE_GOODS,
  exchangeStock,
  changeExchangeStock,
  exchangePrice,
  exportableStock,
} from "./livingEconomy";
import { relationFor } from "./diplomacy";
// Defaults take bullion, then industrial goods and metals; food, oil and water go last and only above the national subsistence reserve.
const SUBSISTENCE_GOODS: (typeof EXCHANGE_GOODS)[number][] = ["water", "food", "oil"];
const COLLATERAL_ORDER: (typeof EXCHANGE_GOODS)[number][] = [
  "gold",
  "silver",
  ...EXCHANGE_GOODS.filter(
    (x) =>
      !["gold", "silver", "iron", "uranium"].includes(x) &&
      !SUBSISTENCE_GOODS.includes(x),
  ),
  "iron",
  "uranium",
  ...SUBSISTENCE_GOODS,
];
export const expansion = (s: GameState): ExpansionState =>
  s.world.expansion ?? {
    integrations: {},
    preparation: {},
    creditOffers: [],
    loans: [],
    forcedTaxes: {},
    victories: [],
  };
export const updateExpansion = (
  s: GameState,
  e: ExpansionState,
): GameState => ({ ...s, world: { ...s.world, expansion: e } });
export const arrears = (s: GameState, id: string) =>
  expansion(s)
    .loans.filter((l) => l.borrowerId === id && l.status === "arrears")
    .reduce((n, l) => n + l.outstanding, 0);
export const loanTotal = (principal: number, apr: number, days: number) =>
  principal * (1 + ((apr / 100) * days) / 365);
export function riskRate(s: GameState, id: string) {
  const c = s.countries[id];
  return Math.min(
    25,
    Math.max(
      3,
      3 +
        (100 - c.politics.stability) * 0.08 +
        c.economy.inflation * 0.08 +
        (c.economy.debt / Math.max(1, c.economy.gdp)) * 5,
    ),
  );
}
function validPair(s: GameState, a: string, b: string) {
  const x = s.countries[a],
    y = s.countries[b];
  return (
    x &&
    y &&
    !x.annexedBy &&
    !y.annexedBy &&
    !x.globalSanctions &&
    !y.globalSanctions &&
    !x.controllerCountryId &&
    !y.controllerCountryId &&
    a !== b &&
    relationFor(x, b).status !== "war" &&
    !relationFor(x, b).sanctions
  );
}
export function creditOfferStatus(s:GameState,kind:CreditOffer['kind'],principal:number,apr:number,days:CreditOffer['days'],countryId=s.playerCountryId){
 const c=s.countries[countryId],e=expansion(s),reasons:string[]=[];
 const maxPrincipal=c?Math.max(1,c.economy.gdp*.5):0;
 const openOffers=e.creditOffers.filter(o=>o.countryId===countryId&&o.status==='open').length;
 if(!c||c.annexedBy||c.controllerCountryId)reasons.push('Only an independent country can publish credit.');
 if(!['lend','borrow'].includes(kind))reasons.push('Choose lending or borrowing.');
 if(!Number.isFinite(principal)||principal<.001)reasons.push('Principal must be at least $1M.');
 if(principal>maxPrincipal)reasons.push('Principal exceeds the national limit: 50% of GDP, with a $1B minimum limit.');
 if(!Number.isFinite(apr)||apr<0||apr>30)reasons.push('Annual interest must be between 0% and 30%.');
 if(![90,180,365].includes(days))reasons.push('Choose a 90, 180 or 365 day term.');
 if(arrears(s,countryId)>0)reasons.push('Settle outstanding arrears before publishing new credit.');
 if(openOffers>=3)reasons.push('Three open offers already exist. Cancel one or wait for a match.');
 if(c&&kind==='lend'&&Number.isFinite(principal)&&principal>c.economy.treasury)reasons.push('Insufficient spendable treasury to reserve this lending amount. Reduce the principal or increase treasury.');
 return {allowed:reasons.length===0,reasons,maxPrincipal,openOffers,treasury:c?.economy.treasury??0,shortfall:kind==='lend'&&Number.isFinite(principal)?Math.max(0,principal-(c?.economy.treasury??0)):0};
}
export function postCredit(
  s: GameState,
  kind: CreditOffer["kind"],
  principal: number,
  apr: number,
  days: CreditOffer["days"],
  countryId = s.playerCountryId,
): GameState {
  const e = expansion(s),
    c = s.countries[countryId];
  if(!creditOfferStatus(s,kind,principal,apr,days,countryId).allowed)return s;
  let suffix = e.creditOffers.length;
  const prefix = `credit-${countryId}-${s.day}-`;
  while (
    e.creditOffers.some((o) => o.id === prefix + suffix) ||
    e.loans.some((l) => l.id === `loan-${prefix}${suffix}`)
  )
    suffix++;
  const offer: CreditOffer = {
    id: prefix + suffix,
    countryId,
    kind,
    principal,
    apr,
    days,
    expiresDay: s.day + 30,
    status: "open",
  };
  const n =
    kind === "lend"
      ? {
          ...s,
          countries: {
            ...s.countries,
            [countryId]: {
              ...c,
              economy: {
                ...c.economy,
                treasury: c.economy.treasury - principal,
              },
            },
          },
        }
      : s;
  return updateExpansion(n, { ...e, creditOffers: [offer, ...e.creditOffers] });
}
export function cancelCredit(
  s: GameState,
  id: string,
  expired = false,
): GameState {
  const e = expansion(s),
    o = e.creditOffers.find((o) => o.id === id);
  if (
    !o ||
    o.status !== "open" ||
    (!expired && o.countryId !== s.playerCountryId)
  )
    return s;
  const c = s.countries[o.countryId],
    n =
      o.kind === "lend"
        ? {
            ...s,
            countries: {
              ...s.countries,
              [c.id]: {
                ...c,
                economy: {
                  ...c.economy,
                  treasury: c.economy.treasury + o.principal,
                },
              },
            },
          }
        : s;
  return updateExpansion(n, {
    ...e,
    creditOffers: e.creditOffers.map((x) =>
      x.id === id ? { ...x, status: expired ? "expired" : "cancelled" } : x,
    ),
  });
}
export function acceptCredit(
  s: GameState,
  id: string,
  actor = s.playerCountryId,
): GameState {
  const e = expansion(s),
    o = e.creditOffers.find((o) => o.id === id);
  if (
    !o ||
    o.status !== "open" ||
    o.expiresDay < s.day ||
    !validPair(s, o.countryId, actor)
  )
    return s;
  const lender = o.kind === "lend" ? o.countryId : actor,
    borrower = o.kind === "borrow" ? o.countryId : actor,
    l = s.countries[lender],
    b = s.countries[borrower];
  if (
    arrears(s, borrower) > 0 ||
    (o.kind === "borrow" && l.economy.treasury < o.principal) ||
    e.loans
      .filter((x) => x.borrowerId === borrower && x.status !== "paid")
      .reduce((n, x) => n + x.principal, 0) +
      o.principal >
      b.economy.gdp * 0.5
  )
    return s;
  const loan: SovereignLoan = {
    id: `loan-${id}`,
    lenderId: lender,
    borrowerId: borrower,
    principal: o.principal,
    apr: o.apr,
    startedDay: s.day,
    dueDay: s.day + o.days,
    outstanding: loanTotal(o.principal, o.apr, o.days),
    status: "active",
  };
  return updateExpansion(
    {
      ...s,
      countries: {
        ...s.countries,
        [lender]: {
          ...l,
          economy: {
            ...l.economy,
            treasury:
              l.economy.treasury - (o.kind === "borrow" ? o.principal : 0),
          },
        },
        [borrower]: {
          ...b,
          economy: {
            ...b.economy,
            treasury: b.economy.treasury + o.principal,
            debt: b.economy.debt + o.principal,
          },
        },
      },
    },
    {
      ...e,
      creditOffers: e.creditOffers.map((x) =>
        x.id === id ? { ...x, status: "matched" } : x,
      ),
      loans: [loan, ...e.loans],
    },
  );
}
export function collateralPrice(
  s: GameState,
  good: (typeof EXCHANGE_GOODS)[number],
) {
  const ref = exchangePrice(s, good);
  const asks = living(s)
    .listings.filter(
      (x) => x.good === good && x.status === "open" && x.expiresDay >= s.day,
    )
    .map((x) => x.unitPrice);
  return Math.max(ref * 0.1, Math.min(ref * 0.65, ...asks));
}
export function processCredit(s: GameState, ai = true): GameState {
  let n = s,
    e = expansion(s);
  for (const o of e.creditOffers)
    if (o.status === "open" && o.expiresDay < n.day)
      n = cancelCredit(n, o.id, true);
  for (const original of expansion(n).loans) {
    if (original.status === "paid" || original.dueDay > n.day) continue;
    let loan = { ...original },
      b = n.countries[loan.borrowerId],
      l = n.countries[loan.lenderId];
    if (!b || !l || b.id === l.id) continue;
    if (!loan.interestBooked) {
      b = {
        ...b,
        economy: {
          ...b.economy,
          debt: b.economy.debt + loan.outstanding - loan.principal,
        },
      };
      loan.interestBooked = true;
      n = { ...n, countries: { ...n.countries, [b.id]: b } };
    }
    const cash = Math.min(loan.outstanding, Math.max(0, b.economy.treasury));
    loan.outstanding -= cash;
    n = {
      ...n,
      countries: {
        ...n.countries,
        [b.id]: {
          ...b,
          economy: {
            ...b.economy,
            treasury: b.economy.treasury - cash,
            debt: Math.max(0, b.economy.debt - cash),
          },
        },
        [l.id]: {
          ...l,
          economy: { ...l.economy, treasury: l.economy.treasury + cash },
        },
      },
    };
    let paid = cash;
    const vault = living(n).bankGold[b.id];
    if (vault && loan.outstanding > 1e-9) {
      const price = collateralPrice(n, "gold"),
        q = Math.min(vault.tonnes, loan.outstanding / price),
        value = q * price,
        lv = living(n),
        creditor = lv.bankGold[l.id];
      if (q > 0) {
        n = withLiving(n, {
          ...lv,
          bankGold: {
            ...lv.bankGold,
            [b.id]: { ...vault, tonnes: vault.tonnes - q },
            [l.id]: {
              ...(creditor ?? {
                tonnes: 0,
                confidence: "game-estimate",
                asOf: "collateral transfer",
              }),
              tonnes: (creditor?.tonnes ?? 0) + q,
            },
          },
        });
        loan.outstanding -= value;
        paid += value;
      }
    }
    for (const good of COLLATERAL_ORDER) {
      if (loan.outstanding <= 1e-9) break;
      const seizable = SUBSISTENCE_GOODS.includes(good)
          ? exportableStock(n, b.id, good)
          : exchangeStock(n, b.id, good),
        price = collateralPrice(n, good),
        q = Math.min(Math.max(0, seizable), loan.outstanding / price);
      if (q <= 0) continue;
      n = changeExchangeStock(
        changeExchangeStock(n, b.id, good, -q),
        l.id,
        good,
        q,
      );
      const value = q * price;
      loan.outstanding -= value;
      paid += value;
    }
    b = n.countries[b.id];
    n = {
      ...n,
      countries: {
        ...n.countries,
        [b.id]: {
          ...b,
          economy: {
            ...b.economy,
            debt: Math.max(0, b.economy.debt - (paid - cash)),
          },
        },
      },
    };
    loan.outstanding = Math.max(0, loan.outstanding);
    loan.status = loan.outstanding < 1e-8 ? "paid" : "arrears";
    if (loan.status === "paid") loan.outstanding = 0;
    e = expansion(n);
    n = updateExpansion(n, {
      ...e,
      loans: e.loans.map((x) => (x.id === loan.id ? loan : x)),
    });
    if (
      original.status === "active" &&
      [loan.borrowerId, loan.lenderId].includes(s.playerCountryId)
    )
      n = withLiving(n, {
        ...living(n),
        notice: {
          title: loan.status === "paid" ? "Loan settled" : "Loan in arrears",
          summary:
            loan.status === "paid"
              ? "Cash and collateral settled the matured debt."
              : "Cash and available collateral were insufficient. A negative fiscal balance and compulsory taxes remain until repayment.",
        },
      });
  }
  e = expansion(n);
  const forced = { ...e.forcedTaxes };
  for (const c of activeCountries(n.countries)) {
    if (c.annexedBy) continue;
    const due = arrears(n, c.id);
    if (due > 1e-8) {
      if (forced[c.id] === undefined) forced[c.id] = c.economy.taxRate;
      n = {
        ...n,
        countries: {
          ...n.countries,
          [c.id]: {
            ...c,
            economy: { ...c.economy, taxRate: Math.max(45, c.economy.taxRate) },
          },
        },
      };
    } else if (forced[c.id] !== undefined) {
      n = {
        ...n,
        countries: {
          ...n.countries,
          [c.id]: { ...c, economy: { ...c.economy, taxRate: forced[c.id] } },
        },
      };
      delete forced[c.id];
    }
  }
  n = updateExpansion(n, {
    ...expansion(n),
    forcedTaxes: forced,
    creditOffers: expansion(n)
      .creditOffers.filter((x) => x.status === "open")
      .concat(
        expansion(n)
          .creditOffers.filter((x) => x.status !== "open")
          .slice(0, 100),
      ),
    loans: expansion(n)
      .loans.filter((x) => x.status !== "paid")
      .concat(
        expansion(n)
          .loans.filter((x) => x.status === "paid")
          .slice(0, 150),
      ),
  });
  if (ai && n.day % 14 === 0) {
    const cs = activeCountries(n.countries).filter(
      (c) =>
        !c.annexedBy && !c.controllerCountryId && c.id !== n.playerCountryId,
    );
    for (const c of cs
      .slice((Math.floor(n.day / 14) * 8) % Math.max(1, cs.length))
      .slice(0, 8)) {
      const rate = riskRate(n, c.id);
      if (c.economy.treasury > 10)
        n = postCredit(
          n,
          "lend",
          Math.min(5, c.economy.treasury * 0.1),
          rate,
          180,
          c.id,
        );
      else if (c.economy.treasury < 3)
        n = postCredit(
          n,
          "borrow",
          Math.min(1, c.economy.gdp * 0.05),
          rate,
          90,
          c.id,
        );
    }
    for (const o of expansion(n).creditOffers.filter(
      (x) => x.status === "open",
    )) {
      const actors = cs.filter((c) => validPair(n, c.id, o.countryId));
      const actor =
        o.kind === "borrow"
          ? actors.find(
              (c) =>
                c.economy.treasury > o.principal * 2 &&
                o.apr >= riskRate(n, o.countryId),
            )
          : actors.find(
              (c) => c.economy.treasury < 3 && o.apr <= riskRate(n, c.id) + 1,
            );
      if (actor) n = acceptCredit(n, o.id, actor.id);
    }
  }
  return n;
}
