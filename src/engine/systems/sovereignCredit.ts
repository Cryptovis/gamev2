import {hasFinancialRestriction,organizationSanctionsBlock} from './organizations/sanctions';
import { activeCountries } from "../../domain/sovereignty";
import type { GameState } from "../../domain/game";
import type {
  ExpansionState,
  CreditOffer,
  SovereignLoan,
  CreditApplication,
  CreditTerm,
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
    !organizationSanctionsBlock(s,a,b,'finance') &&
    relationFor(x, b).status !== "war" &&
    !relationFor(x, b).sanctions
  );
}
export function creditOfferStatus(s:GameState,kind:CreditOffer['kind'],principal:number,apr:number,days:CreditTerm,countryId=s.playerCountryId){
 const c=s.countries[countryId],e=expansion(s),reasons:string[]=[];
 const maxPrincipal=c?Math.max(1,c.economy.gdp*.5):0;
 const openOffers=e.creditOffers.filter(o=>o.countryId===countryId&&o.status==='open').length;
 if(!c||c.annexedBy||c.controllerCountryId)reasons.push('Only an independent country can publish credit.');
 if(hasFinancialRestriction(s,countryId))reasons.push('War or sanctions block this agreement.');
 if(!['lend','borrow'].includes(kind))reasons.push('Choose lending or borrowing.');
 if(!Number.isFinite(principal)||principal<.001)reasons.push('Principal must be at least $1M.');
 if(principal>maxPrincipal)reasons.push('Principal exceeds the national limit: 50% of GDP, with a $1B minimum limit.');
 if(!Number.isFinite(apr)||apr<0||apr>30)reasons.push('Annual interest must be between 0% and 30%.');
 if(![90,180,365,730,1095].includes(days))reasons.push('Choose a supported credit term.');
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
  days: CreditTerm,
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
    days:days>365?365:days as CreditOffer['days'],
    ...(days>365?{extendedDays:days as 730|1095}:{}),
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
  terms?:Pick<CreditApplication,'apr'|'days'>,
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
    apr: terms?.apr??o.apr,
    startedDay: s.day,
    dueDay: s.day + (terms?.days??creditTermDays(o)),
    outstanding: loanTotal(o.principal, terms?.apr??o.apr, terms?.days??creditTermDays(o)),
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
  let n = processCreditApplications(s),
    e = expansion(n);
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
    if (loan.status === "paid") {loan.outstanding = 0;loan.paidDay=n.day;}
    if(loan.status==='arrears'&&!loan.defaultRecorded){
      const current=expansion(n),h=current.creditHistory?.[b.id]??{bonus:0,defaults:0};
      n=updateExpansion(n,{...current,creditHistory:{...current.creditHistory,[b.id]:{...h,defaults:Math.min(20,h.defaults+1)}}});loan.defaultRecorded=true;
    }
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
      if (actor) n = applyForCredit(n, o.id, actor.id);
    }
  }
  if(ai)n=emergencyCreditOffers(n);
  return n;
}

export const creditTermDays = (offer: CreditOffer): CreditTerm => offer.extendedDays ?? offer.days;
const clampCredit = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
/** Ratings belong to this simulation. They never claim to reproduce an agency's real-world rating. */
export function creditRating(s: GameState, id: string) {
    const c = s.countries[id], h = expansion(s).creditHistory?.[id] ?? { bonus: 0, defaults: 0 };
    const debtRatio = Math.max(0, c.economy.debt) / Math.max(.001, c.economy.gdp);
    const liquidity = Math.max(0, c.economy.treasury) / Math.max(.001, c.economy.gdp);
    const score = arrears(s, id) > 1e-8 ? 0 : clampCredit(38 + c.politics.stability * .4 + c.diplomacy.reputation * .1 + Math.min(15, liquidity * 100) - debtRatio * 30 - Math.max(0, c.economy.inflation) * 1.2 + h.bonus - h.defaults * 5, 0, 100);
    const grade = score >= 90 ? 'AAA' : score >= 80 ? 'AA' : score >= 70 ? 'A' : score >= 60 ? 'BBB' : score >= 50 ? 'BB' : score >= 40 ? 'B' : score >= 30 ? 'CCC' : score >= 20 ? 'CC' : score > 0 ? 'C' : 'D';
    return { score, grade, debtRatio, liquidity, historyBonus: h.bonus, defaults: h.defaults };
}
export function creditApplicationPreview(s: GameState, offerId: string, actor = s.playerCountryId) {
    const e = expansion(s), offer = e.creditOffers.find(o => o.id === offerId), reasons: string[] = [];
    const lenderId = offer?.kind === 'lend' ? offer.countryId : actor, borrowerId = offer?.kind === 'borrow' ? offer.countryId : actor;
    if (!offer || offer.status !== 'open' || offer.expiresDay < s.day)
        reasons.push('This credit offer is no longer available.');
    if (!offer || !validPair(s, offer.countryId, actor) || offer.targetCountryId && offer.targetCountryId !== actor)
        reasons.push('Credit requires independent, unsanctioned countries at peace.');
    const lender = s.countries[lenderId], borrower = s.countries[borrowerId], rating = borrower ? creditRating(s, borrowerId) : null;
    const relation = lender && borrower ? Math.min(relationFor(lender, borrowerId).score, relationFor(borrower, lenderId).score) : -100;
    const trustThreshold = lender ? 25 + lender.politics.stability * .25 : 100;
    const principal = offer?.principal ?? 0;
    const capacity = borrower ? Math.max(0, borrower.economy.gdp * .5 - e.loans.filter(l => l.borrowerId === borrowerId && l.status !== 'paid').reduce((v, l) => v + l.principal, 0)) : 0;
    if (principal > capacity)
        reasons.push('The borrower has reached its sovereign debt capacity.');
    if (borrower && arrears(s, borrowerId) > 0)
        reasons.push('Settle outstanding arrears before applying for credit.');
    if (offer?.kind === 'borrow' && lender && lender.economy.treasury < principal)
        reasons.push('The lender lacks the cash to fund this request.');
    if (e.creditApplications?.some(a => a.offerId === offerId && a.actorId === actor && a.status === 'pending'))
        reasons.push('An application for this offer is already pending.');
    if ((e.creditApplications ?? []).filter(a => a.actorId === actor && a.status === 'pending').length >= 3)
        reasons.push('Three credit applications are already pending.');
    // Fixed published lending rates are reference quotes; borrower risk and bilateral trust personalize the actual binding APR.
    const apr = offer?.kind === 'lend' && rating ? Number(clampCredit(offer.apr + (70 - rating.score) * .06 - Math.max(0, relation) * .01, 1, 30).toFixed(2)) : offer?.apr ?? 0;
    const decisionReason = relation < 0 ? 'The lender declined because relations are too low.' : rating && rating.score < trustThreshold && !offer?.emergency ? 'The lender declined because the credit rating is too weak.' : rating && rating.score < 20 ? 'The lender declined because repayment risk is too high.' : null;
    return { allowed: reasons.length === 0, reasons, offer, lenderId, borrowerId, principal, apr, days: offer ? creditTermDays(offer) : 365, decisionDay: s.day + 3, relation, rating, decisionReason, capacity };
}
export function applyForCredit(s: GameState, offerId: string, actor = s.playerCountryId): GameState {
    const view = creditApplicationPreview(s, offerId, actor);
    if (!view.allowed)
        return s;
    const e = expansion(s);
    let suffix = (e.creditApplications ?? []).length;
    const prefix = `application-${actor}-${s.day}-`;
    while (e.creditApplications?.some(a => a.id === prefix + suffix))
        suffix++;
    const application: CreditApplication = { id: prefix + suffix, offerId, actorId: actor, lenderId: view.lenderId, borrowerId: view.borrowerId, principal: view.principal, apr: view.apr, days: view.days, createdDay: s.day, decisionDay: view.decisionDay, status: 'pending' };
    return updateExpansion(s, { ...e, creditApplications: [application, ...e.creditApplications ?? []] });
}
export function processCreditApplications(s: GameState): GameState {
    let n = s;
    for (const a of expansion(n).creditApplications ?? []) {
        if (a.status !== 'pending' || a.decisionDay > n.day)
            continue;
        const e = expansion(n), checkState = updateExpansion(n, { ...e, creditApplications: e.creditApplications?.filter(x => x.id !== a.id) });
        const view = creditApplicationPreview(checkState, a.offerId, a.actorId);
        const reason = view.reasons[0] ?? view.decisionReason;
        const next = reason ? n : acceptCredit(n, a.offerId, a.actorId, { apr: a.apr, days: a.days });
        const approved = next !== n;
        n = updateExpansion(next, { ...expansion(next), creditApplications: expansion(next).creditApplications?.map(x => x.id === a.id ? { ...x, status: approved ? 'approved' : 'rejected', reason: approved ? 'The loan was funded.' : reason ?? 'This credit offer is no longer available.', loanId: approved ? `loan-${a.offerId}` : undefined } : x) });
        if ([a.borrowerId, a.lenderId].includes(n.playerCountryId))
            n = { ...n, sitrep: [`${approved ? 'Credit approved' : 'Credit rejected'} · ${n.countries[a.lenderId]?.name} → ${n.countries[a.borrowerId]?.name}`, ...n.sitrep].slice(0, 12) };
    }
    const e = expansion(n);
    if (e.creditApplications)
        n = updateExpansion(n, { ...e, creditApplications: e.creditApplications.filter(a => a.status === 'pending').concat(e.creditApplications.filter(a => a.status !== 'pending').slice(0, 100)) });
    return n;
}
/**
 * Phase 3: rescue lines come from any lender on non-hostile terms (relations ≥ 0), matching the approval rule. The old
 * "≥ 20" offer threshold left 70 of 96 small economies without any possible rescue lender at the start of a campaign.
 */
export const RESCUE_MIN_RELATION = 0;
/** Cash-poor countries can receive a bounded three-year rescue line, never free money or an automatic loan. */
export function emergencyCreditOffers(s: GameState, borrowerId = s.playerCountryId): GameState {
    const b = s.countries[borrowerId];
    if (!b || b.annexedBy || b.controllerCountryId || b.globalSanctions || b.economy.treasury >= b.economy.gdp * .015 || creditRating(s, b.id).score < 20 || arrears(s, b.id) > 0)
        return s;
    const e = expansion(s);
    if (e.loans.some(l => l.borrowerId === b.id && l.status !== 'paid' && l.dueDay - l.startedDay > 365) || e.creditOffers.some(o => o.emergency && o.targetCountryId === b.id && o.expiresDay >= s.day && o.status === 'open'))
        return s;
    let n = s;
    const lenders = activeCountries(s.countries).filter(c => validPair(s, c.id, b.id) && Math.min(relationFor(c, b.id).score, relationFor(b, c.id).score) >= RESCUE_MIN_RELATION && c.economy.treasury > Math.max(.01, c.economy.gdp * .04)).sort((a, c) => c.economy.treasury - a.economy.treasury || a.id.localeCompare(c.id)).slice(0, 3);
    for (const l of lenders) {
        const principal = Math.min(l.economy.treasury * .08, b.economy.gdp * .04);
        const before = expansion(n).creditOffers.length;
        const next = postCredit(n, 'lend', principal, Math.min(30, riskRate(n, b.id) + 3), 1095, l.id);
        if (expansion(next).creditOffers.length === before)
            continue;
        const current = expansion(next), offer = current.creditOffers[0];
        n = updateExpansion(next, { ...current, creditOffers: current.creditOffers.map(o => o.id === offer.id ? { ...o, targetCountryId: b.id, emergency: true } : o) });
    }
    return n;
}
export function availableCreditOffers(s: GameState, id = s.playerCountryId) {
    return expansion(s).creditOffers.filter(o => o.status === 'open' && o.expiresDay >= s.day && (!o.targetCountryId || o.targetCountryId === id) && (o.countryId === id || o.kind === 'borrow' || o.emergency || creditRating(s, id).score >= 25 + s.countries[o.countryId].politics.stability * .25));
}
export function repaymentPreview(s: GameState, loanId: string, actor = s.playerCountryId) {
    const loan = expansion(s).loans.find(l => l.id === loanId), reasons: string[] = [];
    if (!loan || loan.status === 'paid' || loan.borrowerId !== actor)
        reasons.push('Only the borrower can repay an outstanding loan.');
    const elapsed = loan ? Math.max(0, Math.min(s.day, loan.dueDay) - loan.startedDay) : 0;
    const amount = loan ? loan.interestBooked || s.day >= loan.dueDay ? loan.outstanding : Math.min(loan.outstanding, loanTotal(loan.principal, loan.apr, elapsed)) : 0;
    const treasury = s.countries[actor]?.economy.treasury ?? 0;
    if (treasury < amount)
        reasons.push('Insufficient spendable treasury for full repayment.');
    const history = expansion(s).creditHistory?.[actor];
    const eligible = loan && loan.status === 'active' && s.day < loan.dueDay && elapsed >= 7 && loan.principal >= s.countries[actor].economy.gdp * .001 && s.day - (history?.lastRewardDay ?? -100) >= 30;
    const scoreGain = eligible ? Math.min(3, loan!.principal / Math.max(.001, s.countries[actor].economy.gdp) * 100, 10 - (history?.bonus ?? 0)) : 0;
    return { allowed: reasons.length === 0, reasons, loan, amount, interestSaved: loan ? Math.max(0, loan.outstanding - amount) : 0, treasuryAfter: treasury - amount, scoreGain };
}
export function repayCredit(s: GameState, loanId: string, actor = s.playerCountryId): GameState {
    const v = repaymentPreview(s, loanId, actor);
    if (!v.allowed || !v.loan)
        return s;
    const loan = v.loan, b = s.countries[actor], l = s.countries[loan.lenderId], e = expansion(s), h = e.creditHistory?.[actor] ?? { bonus: 0, defaults: 0 };
    const debtReduction = loan.interestBooked ? loan.outstanding : loan.principal;
    let n = updateExpansion({ ...s, countries: { ...s.countries, [actor]: { ...b, economy: { ...b.economy, treasury: b.economy.treasury - v.amount, debt: Math.max(0, b.economy.debt - debtReduction) } }, [l.id]: { ...l, economy: { ...l.economy, treasury: l.economy.treasury + v.amount } } } }, { ...e, loans: e.loans.map(x => x.id === loanId ? { ...x, outstanding: 0, status: 'paid', paidDay: s.day, earlyRepaid: s.day < loan.dueDay } : x), creditHistory: { ...e.creditHistory, [actor]: { ...h, bonus: h.bonus + v.scoreGain, ...(v.scoreGain > 0 ? { lastRewardDay: s.day } : {}) } } });
    if (arrears(n, actor) < 1e-8 && e.forcedTaxes[actor] !== undefined) {
        const taxes = { ...e.forcedTaxes };
        delete taxes[actor];
        n = updateExpansion({ ...n, countries: { ...n.countries, [actor]: { ...n.countries[actor], economy: { ...n.countries[actor].economy, taxRate: e.forcedTaxes[actor] } } } }, { ...expansion(n), forcedTaxes: taxes });
    }
    return n;
}
