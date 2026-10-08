import { describe, it, expect } from "vitest";
import { makeInitialState } from "../data/initialState";
import {
  populationForecast,
  distributeMigration,
  civilianPopulation,
} from "../engine/systems/population";
import { simulateResources } from "../engine/systems/resources";
import { simulateEconomy } from "../engine/systems/economy";
import { simulatePolitics } from "../engine/systems/politics";
import {
  living,
  postListing,
  buyListing,
  cancelListing,
  exchangeStock,
  exchangePrice,
  processExchange,
  moveBankGold,
  recruitPersonnel,
  startActivity,
  processWellbeing,
  dismissAdvice,
  restoreAdvice,
  requestDiplomacy,
  processLetters,
  resolveIncomingLetter,
  withLiving,
  exportableStock,
} from "../engine/systems/livingEconomy";
import {
  addTreaty,
  openEmbassy,
  changeRelations,
  embassyFor,
} from "../engine/systems/diplomacy";
import {
  industrialQuote,
  tankDomesticCost,
  industrialPrice,
} from "../engine/systems/industrialMarket";
import { processIndustrialEconomy } from "../engine/systems/industrialEconomy";
import { applyGameCommand } from "../engine/commands";
import { migrateSave } from "../persistence/migrations";
import { snapshotGame } from "../persistence/snapshot";
import { money } from "../ui/formatMoney";
import type { GameState } from "../domain/game";
function friendly(s = makeInitialState()) {
  s = changeRelations(s, "TUR", "BRA", 100);
  return addTreaty(s, "TUR", "BRA", "trade");
}
function sale() {
  const s = friendly();
  s.industrialEconomy.TUR.stock.water = 200;
  s.industrialEconomy.BRA.stock.water = 0;
  const n = postListing(s, "water", 10, exchangePrice(s, "water"));
  return { s, n, id: living(n).listings[0].id };
}
describe("demographics and tax consequences", () => {
  it("healthy food and income improve births while high taxes raise revenue and depress wellbeing", () => {
    const s = makeInitialState(),
      c = s.countries.TUR;
    c.resources.food = 1000;
    c.economy.inflation = 3;
    c.economy.unemployment = 4;
    c.politics.stability = 80;
    const low = { ...c, economy: { ...c.economy, taxRate: 12 } },
      high = { ...c, economy: { ...c.economy, taxRate: 55 } },
      a = populationForecast(low, simulateResources(low)),
      b = populationForecast(high, simulateResources(high));
    expect(a.welfare).toBeGreaterThan(b.welfare);
    expect(a.birthsPerThousand).toBeGreaterThan(b.birthsPerThousand);
    const la = simulateEconomy(low, simulateResources(low)),
      hb = simulateEconomy(high, simulateResources(high));
    expect(hb.taxRevenue).toBeGreaterThan(la.taxRevenue);
    expect(
      simulatePolitics(low, la, simulateResources(low)).approval,
    ).toBeGreaterThan(
      simulatePolitics(high, hb, simulateResources(high)).approval,
    );
  });
  it("severe living conditions produce negative population change and emigration without compounding the baseline", () => {
    const c = makeInitialState().countries.TUR;
    c.resources.food = 0;
    c.resourceProduction.food = 0;
    c.economy.inflation = 60;
    c.economy.unemployment = 35;
    c.economy.taxRate = 60;
    c.politics.stability = 10;
    const d = populationForecast(c, simulateResources(c));
    expect(d.growthRate).toBeLessThan(0);
    expect(d.netMigration).toBeLessThan(0);
    expect(d.population).toBeLessThan(c.demographics.population);
    const next = populationForecast(
      { ...c, demographics: d },
      simulateResources(c),
    );
    expect(next.baseGrowthRate).toBe(c.demographics.growthRate);
  });
  it("routes emigrants into attractive destinations and conserves total population across that routing", () => {
    const s = makeInitialState(),
      a = s.countries.TUR,
      b = s.countries.BRA;
    const c = {
      TUR: {
        ...a,
        demographics: {
          ...a.demographics,
          welfare: 15,
          netMigration: -100,
          population: a.demographics.population - 100,
        },
      },
      BRA: {
        ...b,
        politics: { ...b.politics, stability: 80 },
        demographics: { ...b.demographics, welfare: 90, netMigration: 0 },
      },
    };
    const n = distributeMigration(c);
    expect(n.BRA.demographics.population).toBe(b.demographics.population + 100);
    expect(
      Object.values(n).reduce((v, x) => v + x.demographics.population, 0),
    ).toBe(a.demographics.population + b.demographics.population);
  });
  it("recruitment transfers civilians without deleting total population and validates limits", () => {
    const s = makeInitialState(),
      p = s.countries.TUR,
      n = recruitPersonnel(s, 10000),
      c = n.countries.TUR;
    expect(c.demographics.population).toBe(p.demographics.population);
    expect(civilianPopulation(c)).toBe(civilianPopulation(p) - 10000);
    expect(c.demographics.workforce).toBeLessThan(p.demographics.workforce);
    expect(c.economy.treasury).toBe(p.economy.treasury - 0.25);
    expect(recruitPersonnel(s, Infinity)).toBe(s);
    expect(recruitPersonnel(s, -1)).toBe(s);
    expect(recruitPersonnel(s, 1.5)).toBe(s);
    expect(
      simulateEconomy(c, simulateResources(c)).publicSpending,
    ).toBeGreaterThan(simulateEconomy(p, simulateResources(p)).publicSpending);
  });
});
describe("open exchange settlement and precious metals", () => {
  it("reserves stock without creating revenue, settles partial fills and restores only unsold goods", () => {
    const { s, n, id } = sale(),
      before = s.countries.TUR.economy.treasury;
    expect(exchangeStock(n, "TUR", "water")).toBe(190);
    expect(n.countries.TUR.economy.treasury).toBe(before);
    const b = buyListing(n, id, 4, "BRA"),
      cost = 4 * living(n).listings[0].unitPrice;
    expect(exchangeStock(b, "BRA", "water")).toBe(4);
    expect(b.countries.TUR.economy.treasury).toBeCloseTo(before + cost);
    expect(
      b.countries.TUR.economy.treasury + b.countries.BRA.economy.treasury,
    ).toBeCloseTo(
      n.countries.TUR.economy.treasury + n.countries.BRA.economy.treasury,
    );
    const cancelled = cancelListing(b, id);
    expect(exchangeStock(cancelled, "TUR", "water")).toBe(196);
    expect(cancelListing(cancelled, id)).toBe(cancelled);
    expect(buyListing(cancelled, id, 1, "BRA")).toBe(cancelled);
  });
  it("rejects overselling, bad numbers, forbidden access and unaffordable fills", () => {
    const { s, n, id } = sale();
    expect(postListing(s, "water", 100000, 1)).toBe(s);
    expect(postListing(s, "water", 1, NaN)).toBe(s);
    expect(buyListing(n, id, 11, "BRA")).toBe(n);
    expect(buyListing(n, id, NaN, "BRA")).toBe(n);
    const locked = makeInitialState();
    expect(
      buyListing({ ...n, countries: locked.countries }, id, 1, "BRA").countries,
    ).toBe(locked.countries);
    const poor = {
      ...n,
      countries: {
        ...n.countries,
        BRA: {
          ...n.countries.BRA,
          economy: { ...n.countries.BRA.economy, treasury: 0 },
        },
      },
    };
    expect(buyListing(poor, id, 1, "BRA")).toBe(poor);
  });
  it("expires escrow back to the seller once", () => {
    const { s, n, id } = sale();
    const done = processExchange({ ...n, day: 62 });
    expect(living(done).listings.find((x) => x.id === id)?.status).toBe(
      "expired",
    );
    expect(exchangeStock(done, "TUR", "water")).toBe(
      exchangeStock(s, "TUR", "water"),
    );
    expect(exchangeStock(processExchange(done), "TUR", "water")).toBe(
      exchangeStock(s, "TUR", "water"),
    );
  });
  it("AI buys competitively priced shortages but leaves an exaggerated player price unsold", () => {
    const { n, id } = sale(),
      normal = processExchange({ ...n, day: 7 });
    expect(
      living(normal).listings.find((x) => x.id === id)?.remaining,
    ).toBeLessThan(10);
    const expensive = withLiving(n, {
      ...living(n),
      listings: living(n).listings.map((x) => ({
        ...x,
        unitPrice: x.unitPrice * 1000,
      })),
    });
    expect(
      living(processExchange({ ...expensive, day: 7 })).listings.find(
        (x) => x.id === id,
      )?.remaining,
    ).toBe(10);
  });
  it("escrow does not inflate world reference prices", () => {
    const { s, n } = sale();
    expect(exchangePrice(n, "water")).toBeCloseTo(exchangePrice(s, "water"));
  });
  it("preserves global stock when seeding seller offers and never lists player supplies", () => {
    const s = makeInitialState(),
      n = processExchange(s, true);
    expect(living(n).listings.length).toBeGreaterThan(0);
    expect(living(n).listings.some((x) => x.sellerId === "TUR")).toBe(false);
    for (const good of ["water", "gold", "tanks"] as const) {
      const before = Object.keys(s.countries).reduce(
          (v, id) => v + exchangeStock(s, id, good),
          0,
        ),
        after =
          Object.keys(n.countries).reduce(
            (v, id) => v + exchangeStock(n, id, good),
            0,
          ) +
          living(n)
            .listings.filter((x) => x.good === good)
            .reduce((v, x) => v + x.remaining, 0);
      expect(after).toBeCloseTo(before);
    }
  });
  it("keeps central-bank gold separate and transfers tonnes without money or duplicate metal", () => {
    const s = makeInitialState(),
      old = living(s).bankGold.TUR.tonnes,
      metal = exchangeStock(s, "TUR", "gold"),
      n = moveBankGold(s, 0.1, "release");
    expect(living(n).bankGold.TUR.tonnes).toBeCloseTo(old - 0.1);
    expect(exchangeStock(n, "TUR", "gold")).toBeCloseTo(metal + 0.1);
    expect(n.countries.TUR.economy.treasury).toBe(
      s.countries.TUR.economy.treasury,
    );
    expect(
      moveBankGold(n, 0.1, "deposit").world.living?.bankGold.TUR.tonnes,
    ).toBeCloseTo(old);
    expect(moveBankGold(s, old + 1, "release")).toBe(s);
    expect(Object.keys(living(s).bankGold)).toHaveLength(
      Object.keys(s.countries).length,
    );
    expect(living(s).bankGold.CHN.confidence).toBe("reported");
    expect(living(s).bankGold.CHN.tonnes).toBe(2387);
    expect(living(s).bankGold.TUR.confidence).toBe("game-estimate");
  });
  it("raises precious-metal reference prices during war and keeps finished imports above assembly costs", () => {
    let s = makeInitialState();
    const gold = industrialPrice(s, "gold");
    s = applyGameCommand(s, {
      type: "military/declareWar",
      targetCountryId: "GRC",
    });
    expect(industrialPrice(s, "gold")).toBeGreaterThan(gold);
    s = friendly(s);
    s = addTreaty(s, "TUR", "BRA", "alliance");
    const q = industrialQuote(s, "BRA", "TUR", "tanks", 1);
    expect(q.price).toBeGreaterThan(tankDomesticCost(s, "BRA"));
    expect(q.price).toBeLessThan(0.15);
  });
  it("electronics cannot run without required precious metals", () => {
    const s = makeInitialState(),
      n = s.industrialEconomy.TUR;
    n.facilities.electronics_works = 1;
    for (const k of Object.keys(n.facilities) as Array<
      keyof typeof n.facilities
    >)
      if (k !== "electronics_works") n.enabled[k] = false;
    n.stock.gold = 0;
    n.stock.silver = 0;
    s.countries.TUR.processedResources.electricity = 100;
    const out = processIndustrialEconomy(s);
    expect(out.industrialEconomy.TUR.lastOutput.electronics).toBe(0);
    expect(out.industrialEconomy.TUR.bottlenecks.electronics_works).toBe(
      "Gold",
    );
  });
});
describe("public programs and cabinet consent", () => {
  it("charges an event once, applies daily benefits once and observes post-event cooldown", () => {
    const s = makeInitialState(),
      p = s.countries.TUR,
      n = startActivity(s, "festival");
    expect(n.countries.TUR.economy.treasury).toBeCloseTo(
      p.economy.treasury - 0.2,
    );
    expect(startActivity(n, "festival")).toBe(n);
    const day = processWellbeing({ ...n, day: 2 });
    expect(day.countries.TUR.politics.approval).toBe(p.politics.approval + 0.5);
    expect(processWellbeing(day).countries.TUR.politics.approval).toBe(
      day.countries.TUR.politics.approval,
    );
    expect(startActivity({ ...day, day: 20 }, "festival").world).toBe(
      day.world,
    );
    expect(startActivity({ ...day, day: 39 }, "festival").world).not.toBe(
      day.world,
    );
  });
  it("relief consumes actual food and requires sufficient reserves", () => {
    const s = makeInitialState(),
      before = s.countries.TUR.resources.food,
      n = startActivity(s, "food_relief");
    expect(n.countries.TUR.resources.food).toBe(before - 20);
    s.countries.TUR.resources.food = 1;
    expect(startActivity(s, "food_relief")).toBe(s);
  });
  it("suppression preferences survive saves and Help can restore warning eligibility", () => {
    let s = makeInitialState();
    s.world.tutorial.active = false;
    s.countries.TUR.politics.approval = 10;
    s = processWellbeing(s);
    expect(living(s).advice.active).toBe("approval");
    s = dismissAdvice(s, "approval", true);
    const saved = migrateSave(snapshotGame(s))!;
    expect(living(saved).advice.suppressed).toContain("approval");
    expect(
      living(processWellbeing({ ...saved, day: 40 })).advice.active,
    ).not.toBe("approval");
    const enabled = restoreAdvice(saved);
    expect(
      living(processWellbeing({ ...enabled, day: 41 })).advice.active,
    ).toBe("approval");
  });
});
describe("retained diplomatic correspondence", () => {
  it("does not open or charge a sent proposal until a seeded three-day acceptance and cannot repeat", () => {
    let s = makeInitialState();
    s = changeRelations(s, "TUR", "BRA", 100);
    const before = s.countries.TUR.economy.treasury,
      n = requestDiplomacy(s, "BRA", "embassy");
    expect(n.countries.TUR.economy.treasury).toBe(before);
    expect(embassyFor(n, "TUR", "BRA")).toBeNull();
    expect(requestDiplomacy(n, "BRA", "embassy")).toBe(n);
    expect(living(processLetters({ ...n, day: 3 })).letters[0].status).toBe(
      "pending",
    );
    const done = processLetters({ ...n, day: 4, simulationSeed: 1 });
    expect(living(done).letters[0].status).toBe("accepted");
    expect(done.countries.TUR.economy.treasury).toBe(before - 3);
    expect(embassyFor(done, "TUR", "BRA")).not.toBeNull();
    expect(processLetters(done).countries.TUR.economy.treasury).toBe(
      done.countries.TUR.economy.treasury,
    );
  });
  it("stores rejection without charges or access and prevents immediate retry", () => {
    let s = makeInitialState();
    s = changeRelations(s, "TUR", "BRA", -60);
    const n = requestDiplomacy(s, "BRA", "trade_pact"),
      done = processLetters({ ...n, day: 4, simulationSeed: 1000 });
    expect(living(done).letters[0].status).toBe("rejected");
    expect(done.countries.TUR.economy.treasury).toBe(
      s.countries.TUR.economy.treasury,
    );
    expect(done.countries.TUR.diplomacy.relations.BRA.treaties).not.toContain(
      "trade",
    );
    expect(requestDiplomacy(done, "BRA", "trade_pact")).toBe(done);
  });
  it("splits incoming setup fees between two countries and protects expired/poor offers", () => {
    let s = makeInitialState();
    s.diplomaticOffers = [
      {
        id: "shared",
        type: "embassy",
        senderId: "BRA",
        receiverId: "TUR",
        createdDay: 1,
        expiresDay: 30,
        message: "test",
      },
    ];
    s = processLetters(s);
    const a = s.countries.TUR.economy.treasury,
      b = s.countries.BRA.economy.treasury,
      n = resolveIncomingLetter(s, "shared", true);
    expect(n.countries.TUR.economy.treasury).toBe(a - 1.5);
    expect(n.countries.BRA.economy.treasury).toBe(b - 1.5);
    expect(resolveIncomingLetter(n, "shared", true)).toBe(n);
    expect(
      resolveIncomingLetter({ ...s, day: 31 }, "shared", true).countries,
    ).toBe(s.countries);
    s.countries.BRA.economy.treasury = 0;
    expect(resolveIncomingLetter(s, "shared", true)).toBe(s);
  });
  it("closes an embassy after hostile deterioration, emits a retained notice and does not repeat it", () => {
    let s = openEmbassy(makeInitialState(), "TUR", "BRA");
    s = changeRelations(s, "TUR", "BRA", -100);
    const n = processLetters(s);
    expect(embassyFor(n, "TUR", "BRA")).toBeNull();
    expect(living(n).notice?.title).toBe("Embassy closed");
    expect(living(n).letters.filter((x) => x.kind === "closure")).toHaveLength(
      1,
    );
    expect(
      living(processLetters(n)).letters.filter((x) => x.kind === "closure"),
    ).toHaveLength(1);
  });
  it("migrates old schema-14 industrial profiles with precious metal fields without resetting progress", () => {
    const s = makeInitialState();
    delete s.world.living;
    delete (s.industrialEconomy.TUR.stock as any).gold;
    delete (s.industrialEconomy.TUR.facilities as any).gold_mine;
    s.industrialEconomy.TUR.stock.engines = 321;
    const n = migrateSave(snapshotGame(s))!;
    expect(n.industrialEconomy.TUR.stock.engines).toBe(321);
    expect(n.industrialEconomy.TUR.stock.gold).toBeGreaterThan(0);
    expect(n.industrialEconomy.TUR.facilities.gold_mine).toBeGreaterThanOrEqual(
      0,
    );
    expect(living(n).bankGold.TUR).toBeDefined();
  });
  it("serializes escrow, correspondence and warning preferences across save/load", () => {
    const { n, id } = sale();
    const sent = requestDiplomacy(n, "GRC", "embassy"),
      save = migrateSave(snapshotGame(sent))!;
    expect(living(save).listings.find((x) => x.id === id)?.remaining).toBe(10);
    expect(living(save).letters[0].status).toBe("pending");
    expect(cancelListing(save, id).industrialEconomy.TUR.stock.water).toBe(200);
  });
});
it("formats billion engine amounts in readable USD without hiding million-dollar equipment", () => {
  expect(money(0.04)).toBe("$40M");
  expect(money(0.00025)).toBe("$250K");
  expect(money(5)).toBe("$5B");
  expect(money(0)).toBe("$0");
});

describe("079 safeguards", () => {
  it("keeps blocked emigrants in their origin instead of removing world population", () => {
    const s = makeInitialState(),
      c = s.countries.TUR;
    const countries = {
      TUR: {
        ...c,
        demographics: {
          ...c.demographics,
          population: 1000,
          netMigration: -25,
          welfare: 20,
        },
      },
    };
    const n = distributeMigration(countries);
    expect(n.TUR.demographics.population).toBe(1025);
    expect(n.TUR.demographics.netMigration).toBe(0);
  });
  it("never charges a second incoming embassy proposal after an agreement exists", () => {
    let s = makeInitialState();
    s.diplomaticOffers = [
      {
        id: "stale",
        type: "embassy",
        senderId: "BRA",
        receiverId: "TUR",
        createdDay: 1,
        expiresDay: 30,
        message: "test",
      },
    ];
    s = processLetters(s);
    s = openEmbassy(s, "TUR", "BRA");
    expect(resolveIncomingLetter(s, "stale", true)).toBe(s);
    expect(resolveIncomingLetter(s, "stale", false).countries).toBe(
      s.countries,
    );
  });
  it("cannot resume the clock while cabinet advice is awaiting a decision", () => {
    const s = makeInitialState();
    s.countries.TUR.politics.approval = 10;
    const n = processWellbeing(s);
    expect(living(n).advice.active).not.toBeNull();
    expect(
      applyGameCommand(n, { type: "clock/setSpeed", speed: 1 }).speed,
    ).toBe(0);
  });
});
