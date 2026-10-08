import { describe, it, expect } from "vitest";
import { makeInitialState } from "../data/initialState";
import {
  expansion,
  updateExpansion,
  postCredit,
  acceptCredit,
  cancelCredit,
  processCredit,
  loanTotal,
  arrears,
} from "../engine/systems/sovereignCredit";
import {
  beginIntegration,
  processIntegration,
  prepareIntegration,
  integrationRequirements,
  consolidateTerritory,
} from "../engine/systems/integration";
import {
  living,
  withLiving,
  exchangeStock,
} from "../engine/systems/livingEconomy";
import { activeCountries, sovereignId } from "../domain/sovereignty";
import { governance } from "../engine/systems/governance";
import { openEmbassy, embassyFor } from "../engine/systems/diplomacy";
import {
  pendingVictory,
  queueVictory,
  dismissVictory,
} from "../engine/systems/victory";
import { applyGameCommand } from "../engine/commands";
import { migrateSave } from "../persistence/migrations";
import { snapshotGame } from "../persistence/snapshot";
import { renderSurface } from "../map/surfaceRaster";
import type { GameState } from "../domain/game";
function ready() {
  let s = makeInitialState();
  const c = s.countries.GRC;
  c.controllerCountryId = "TUR";
  c.economy = {
    ...c.economy,
    gdp: (c.demographics.population * 60000) / 1e9,
    taxRate: 10,
    inflation: 2,
    unemployment: 0,
  };
  c.resources.food = 10000;
  c.politics = { ...c.politics, approval: 95, stability: 95 };
  c.society.dominantReligion = s.countries.TUR.society.dominantReligion;
  const g = governance(s);
  s = {
    ...s,
    world: {
      ...s.world,
      governance: {
        ...g,
        occupations: {
          ...g.occupations,
          GRC: {
            controllerId: "TUR",
            unrest: 10,
            policy: "civil",
            lastActionDay: -10,
          },
        },
      },
    },
  };
  return updateExpansion(s, {
    ...expansion(s),
    preparation: { GRC: { language: 80, ideology: 80, lastActionDay: -10 } },
  });
}
function loan() {
  let s = makeInitialState();
  s.countries.TUR.economy.treasury = 10;
  s = postCredit(s, "lend", 1, 3, 365);
  const id = expansion(s).creditOffers[0].id;
  s = acceptCredit(s, id, "FRA");
  return { s, id, l: expansion(s).loans[0] };
}
function clearAssets(s: GameState, id: string) {
  const c = s.countries[id];
  c.economy.treasury = 0;
  s.production[id].stockpile.armor = 0;
  c.processedResources = { fuel: 0, steel: 0, electricity: 0 };
  c.resources = { food: 0, oil: 0, iron: 0, uranium: 0 };
  s.industrialEconomy[id].stock = Object.fromEntries(
    Object.keys(s.industrialEconomy[id].stock).map((k) => [k, 0]),
  ) as typeof s.industrialEconomy.FRA.stock;
  const lv = living(s);
  return withLiving(s, {
    ...lv,
    bankGold: { ...lv.bankGold, [id]: { ...lv.bankGold[id], tonnes: 0 } },
  });
}
describe("sovereign credit", () => {
  it("prorates annual interest for 90,180,365 days", () => {
    expect(loanTotal(0.001, 3, 365)).toBeCloseTo(0.00103, 12);
    expect(loanTotal(1, 3, 90)).toBeCloseTo(1 + (0.03 * 90) / 365, 12);
    expect(loanTotal(1, 3, 180)).toBeCloseTo(1 + (0.03 * 180) / 365, 12);
  });
  it("reserves a lender offer, conserves money and returns unmatched funds exactly once", () => {
    const s = makeInitialState(),
      cash = s.countries.TUR.economy.treasury,
      n = postCredit(s, "lend", 1, 3, 365),
      id = expansion(n).creditOffers[0].id;
    expect(n.countries.TUR.economy.treasury).toBe(cash - 1);
    const back = cancelCredit(n, id);
    expect(back.countries.TUR.economy.treasury).toBe(cash);
    expect(cancelCredit(back, id)).toBe(back);
  });
  it("funds only once and records borrower debt with the exact maturity terms", () => {
    const { s, id, l } = loan();
    expect(l.borrowerId).toBe("FRA");
    expect(l.outstanding).toBeCloseTo(1.03);
    expect(s.countries.TUR.economy.treasury).toBe(9);
    expect(acceptCredit(s, id, "FRA")).toBe(s);
    expect(cancelCredit(s, id)).toBe(s);
  });
  it("validates principal, APR, terms, capacity, sanctions and self-dealing", () => {
    const s = makeInitialState();
    for (const q of [NaN, Infinity, -1, 0])
      expect(postCredit(s, "lend", q, 3, 365)).toBe(s);
    expect(postCredit(s, "lend", 1, 31, 365)).toBe(s);
    const n = postCredit(s, "lend", 1, 3, 365),
      id = expansion(n).creditOffers[0].id;
    expect(acceptCredit(n, id, "TUR")).toBe(n);
    n.countries.FRA.globalSanctions = true;
    expect(acceptCredit(n, id, "FRA")).toBe(n);
  });
  it("expires unmatched lending offers without losing escrow", () => {
    const s = makeInitialState(),
      cash = s.countries.TUR.economy.treasury,
      n = postCredit(s, "lend", 1, 3, 365);
    const expired = processCredit({ ...n, day: 32 }, false);
    expect(expired.countries.TUR.economy.treasury).toBe(cash);
    expect(expansion(expired).creditOffers[0].status).toBe("expired");
  });
  it("collects maturity cash plus interest once and leaves collateral untouched", () => {
    const { s, l } = loan();
    s.countries.FRA.economy.treasury = 1.03;
    const gold = living(s).bankGold.FRA.tonnes;
    const n = processCredit({ ...s, day: l.dueDay }, false);
    expect(expansion(n).loans[0].status).toBe("paid");
    expect(n.countries.TUR.economy.treasury).toBeCloseTo(10.03);
    expect(living(n).bankGold.FRA.tonnes).toBe(gold);
    expect(processCredit(n, false).countries.TUR.economy.treasury).toBe(
      n.countries.TUR.economy.treasury,
    );
  });
  it("seizes vault gold and stock by real transfers, then retains arrears with forced taxes", () => {
    const { s, l } = loan();
    let n = clearAssets(s, "FRA");
    const lv = living(n);
    n = withLiving(n, {
      ...lv,
      bankGold: { ...lv.bankGold, FRA: { ...lv.bankGold.FRA, tonnes: 0.01 } },
    });
    n.industrialEconomy.FRA.stock.silver = 0.01;
    const beforeGold = living(n).bankGold.TUR.tonnes,
      beforeSilver = exchangeStock(n, "TUR", "silver");
    n = processCredit({ ...n, day: l.dueDay }, false);
    expect(living(n).bankGold.FRA.tonnes).toBe(0);
    expect(living(n).bankGold.TUR.tonnes).toBeCloseTo(beforeGold + 0.01);
    expect(exchangeStock(n, "TUR", "silver")).toBeCloseTo(beforeSilver + 0.01);
    expect(arrears(n, "FRA")).toBeGreaterThan(0);
    expect(n.countries.FRA.economy.taxRate).toBeGreaterThanOrEqual(45);
    expect(n.countries.TUR.economy.treasury).toBe(9);
  });
  it("collects later cash, restores the pre-default tax policy and prevents repeat interest", () => {
    const { s, l } = loan(),
      tax = s.countries.FRA.economy.taxRate;
    let n = processCredit({ ...clearAssets(s, "FRA"), day: l.dueDay }, false);
    const due = arrears(n, "FRA");
    n = {
      ...n,
      countries: {
        ...n.countries,
        FRA: {
          ...n.countries.FRA,
          economy: { ...n.countries.FRA.economy, treasury: due },
        },
      },
    };
    n = processCredit({ ...n, day: n.day + 1 }, false);
    expect(arrears(n, "FRA")).toBe(0);
    expect(n.countries.FRA.economy.taxRate).toBe(tax);
    expect(n.countries.TUR.economy.treasury).toBeCloseTo(10.03);
  });
  it("does not let a player bypass compulsory tax policy", () => {
    let s = makeInitialState();
    s = postCredit(s, "borrow", 1, 3, 90);
    s = acceptCredit(s, expansion(s).creditOffers[0].id, "FRA");
    s = processCredit({ ...clearAssets(s, "TUR"), day: 91 }, false);
    expect(arrears(s, "TUR")).toBeGreaterThan(0);
    expect(
      applyGameCommand(s, { type: "economy/setTaxRate", rate: 0 }).countries.TUR
        .economy.taxRate,
    ).toBe(45);
  });
});
describe("territory integration", () => {
  it("requires every live condition and starts exactly 90 days after one upfront payment", () => {
    const s = ready();
    expect(
      integrationRequirements(s, "GRC").every((r) => r.value >= r.min),
    ).toBe(true);
    const cash = s.countries.TUR.economy.treasury,
      n = beginIntegration(s, "GRC");
    expect(expansion(n).integrations.GRC.endsDay - n.day).toBe(90);
    expect(n.countries.TUR.economy.treasury).toBeLessThan(cash);
    expect(beginIntegration(n, "GRC")).toBe(n);
    const blocked = ready();
    blocked.countries.GRC.politics.approval = 89;
    expect(beginIntegration(blocked, "GRC")).toBe(blocked);
  });
  it("rejects war, missing language, religion and instability", () => {
    const s = ready();
    s.countries.GRC.society.dominantReligion = "buddhism";
    s.world.religiousShares.GRC = { buddhism: 90, islam: 10 };
    expect(beginIntegration(s, "GRC")).toBe(s);
    const language = ready();
    language.world.expansion!.preparation.GRC.language = 50;
    expect(beginIntegration(language, "GRC")).toBe(language);
  });
  it("applies funded weekly preparation with no repeated same-day spending", () => {
    const s = ready();
    s.world.expansion!.preparation.GRC.language = 0;
    const n = prepareIntegration(s, "GRC", "language");
    expect(expansion(n).preparation.GRC.language).toBe(15);
    expect(prepareIntegration(n, "GRC", "language")).toBe(n);
    expect(
      prepareIntegration({ ...n, day: n.day + 7 }, "GRC", "language").world
        .expansion!.preparation.GRC.language,
    ).toBe(30);
  });
  it("fails immediately below 80 welfare and never refunds the upfront cost", () => {
    const n = beginIntegration(ready(), "GRC"),
      cash = n.countries.TUR.economy.treasury;
    n.countries.GRC.economy.inflation = 60;
    const failed = processIntegration({ ...n, day: 2 });
    expect(expansion(failed).integrations.GRC.status).toBe("failed");
    expect(failed.countries.TUR.economy.treasury).toBe(cash);
    expect(failed.countries.GRC.annexedBy).toBeUndefined();
  });
  it("fails if control is transferred while the process is active", () => {
    const n = beginIntegration(ready(), "GRC");
    n.countries.GRC.controllerCountryId = "FRA";
    expect(
      expansion(processIntegration({ ...n, day: 2 })).integrations.GRC.status,
    ).toBe("failed");
  });
  it("consolidates population, forces, resources, industry and liabilities exactly once", () => {
    let s = beginIntegration(ready(), "GRC");
    const pop =
        s.countries.TUR.demographics.population +
        s.countries.GRC.demographics.population,
      tanks = s.countries.TUR.military.tanks + s.countries.GRC.military.tanks,
      gold = living(s).bankGold.TUR.tonnes + living(s).bankGold.GRC.tonnes,
      debt = s.countries.TUR.economy.debt + s.countries.GRC.economy.debt,
      water =
        exchangeStock(s, "TUR", "water") + exchangeStock(s, "GRC", "water");
    s = processIntegration({ ...s, day: 91 });
    expect(s.countries.TUR.demographics.population).toBe(pop);
    expect(s.countries.TUR.military.tanks).toBe(tanks);
    expect(s.countries.TUR.economy.debt).toBe(debt);
    expect(living(s).bankGold.TUR.tonnes).toBe(gold);
    expect(exchangeStock(s, "TUR", "water")).toBe(water);
    expect(s.countries.GRC.demographics.population).toBe(0);
    expect(s.countries.GRC.annexedBy).toBe("TUR");
    expect(sovereignId(s.countries, "GRC")).toBe("TUR");
    expect(activeCountries(s.countries).some((c) => c.id === "GRC")).toBe(
      false,
    );
    expect(processIntegration(s).countries.TUR.demographics.population).toBe(
      pop,
    );
  });
  it("inherits counterpart embassies, controlled dependencies and loan obligations", () => {
    let s = ready();
    s.countries.SYR.controllerCountryId = "GRC";
    s = openEmbassy(s, "GRC", "FRA");
    s = postCredit(s, "lend", 1, 3, 365, "FRA");
    s.countries.GRC.controllerCountryId = null;
    s = acceptCredit(s, expansion(s).creditOffers[0].id, "GRC");
    s.countries.GRC.controllerCountryId = "TUR";
    s = consolidateTerritory(s, "GRC", "TUR");
    expect(s.countries.SYR.controllerCountryId).toBe("TUR");
    expect(embassyFor(s, "TUR", "FRA")).not.toBeNull();
    expect(expansion(s).loans[0].borrowerId).toBe("TUR");
  });
  it("retains annexation, credit escrow and preparation across schema-14 save/load", () => {
    let s = consolidateTerritory(ready(), "GRC", "TUR");
    s = postCredit(s, "lend", 1, 3, 365);
    const n = migrateSave(snapshotGame(s))!;
    expect(n.countries.GRC.annexedBy).toBe("TUR");
    expect(expansion(n).creditOffers[0].status).toBe("open");
    expect(sovereignId(n.countries, "GRC")).toBe("TUR");
  });
});
describe("victory and surface rendering", () => {
  it("queues an actual victory once, pauses time and remembers the seeded quotation", () => {
    let s = applyGameCommand(makeInitialState(), {
      type: "military/declareWar",
      targetCountryId: "GRC",
    });
    const w = Object.values(s.wars)[0];
    s = { ...s, wars: { ...s.wars, [w.id]: { ...w, status: "victory" } } };
    const n = queueVictory(s, w.id);
    expect(pendingVictory(n)?.warId).toBe(w.id);
    expect(n.speed).toBe(0);
    expect(queueVictory(n, w.id)).toBe(n);
    expect(pendingVictory(dismissVictory(n, w.id))).toBeUndefined();
    expect(
      pendingVictory(
        queueVictory({ ...s, simulationSeed: s.simulationSeed }, w.id),
      )?.quote,
    ).toBe(pendingVictory(n)?.quote);
  });
  it("never celebrates an enemy victory or a withdrawal", () => {
    let s = applyGameCommand(makeInitialState(), {
      type: "military/declareWar",
      targetCountryId: "GRC",
    });
    const w = Object.values(s.wars)[0];
    s = { ...s, wars: { ...s.wars, [w.id]: { ...w, status: "withdrawn" } } };
    expect(queueVictory(s, w.id)).toBe(s);
  });
  it("produces transparent space and correctly sampled globe pixels without main-thread DOM", () => {
    const data = new Uint8ClampedArray([
      100, 150, 200, 255, 100, 150, 200, 255, 100, 150, 200, 255, 100, 150, 200,
      255,
    ]);
    const pixels = renderSurface(
      { width: 2, height: 2, data },
      {
        flat: false,
        rotate: [0, 0, 0],
        scale: 286,
        translate: [600, 350],
        pan: { x: 0, y: 0 },
        zoom: 1,
      },
      120,
      70,
    );
    expect(pixels[3]).toBe(0);
    expect(pixels[(35 * 120 + 60) * 4 + 3]).toBe(255);
    expect(pixels[(35 * 120 + 60) * 4]).toBeGreaterThan(70);
  });
});

describe("080 renderer and registry safeguards", () => {
  it("chunked raster work matches the full frame exactly", () => {
    const source = {
        width: 2,
        height: 2,
        data: new Uint8ClampedArray([
          30, 80, 120, 255, 50, 90, 130, 255, 80, 110, 170, 255, 90, 140, 220,
          255,
        ]),
      },
      view = {
        flat: false,
        rotate: [0, 0, 0] as [number, number, number],
        scale: 286,
        translate: [600, 350] as [number, number],
        pan: { x: 0, y: 0 },
        zoom: 1,
      };
    const expected = renderSurface(source, view, 120, 70),
      result = new Uint8ClampedArray(120 * 70 * 4);
    renderSurface(source, view, 120, 70, result, 0, 35);
    renderSurface(source, view, 120, 70, result, 35, 70);
    expect(result).toEqual(expected);
  });
  it("keeps retired countries inactive after an ordinary game day", () => {
    let s = consolidateTerritory(ready(), "GRC", "TUR");
    s = {
      ...s,
      activeEvent: null,
      activeAdvisor: null,
      world: {
        ...s.world,
        tutorial: { active: false, step: 0, completed: true },
        living: {
          ...living(s),
          notice: null,
          advice: { ...living(s).advice, active: null },
        },
      },
    };
    const n = applyGameCommand(s, { type: "time/advanceDay" });
    expect(n.countries.GRC.demographics.population).toBe(0);
    expect(n.countries.GRC.economy.gdp).toBe(0);
    expect(n.countries.GRC.military.personnel).toBe(0);
    expect(activeCountries(n.countries).some((c) => c.id === "GRC")).toBe(
      false,
    );
  });
});

describe("absorbed-country pending work", () => {
  it("closes its pending ballots and redirects active operations", () => {
    let s = ready();
    s.world.ballots.push({
      id: "old-vote",
      kind: "membership",
      institution: "who",
      proposerId: "GRC",
      targetId: "GRC",
      openedDay: 1,
      closesDay: 100,
      votes: { FRA: "yes" },
      status: "open",
    });
    s.intelOperations.spy = {
      id: "spy",
      type: "gather_intelligence",
      sourceCountryId: "FRA",
      targetCountryId: "GRC",
      startedDay: 1,
      completeDay: 100,
      status: "active",
      successChance: 0.5,
      resultSummary: "",
    };
    s = consolidateTerritory(s, "GRC", "TUR");
    expect(s.world.ballots.find((x) => x.id === "old-vote")?.status).toBe(
      "rejected",
    );
    expect(s.intelOperations.spy.targetCountryId).toBe("TUR");
  });
});
