import { describe, it, expect } from "vitest";
import { makeInitialState } from "../data/initialState";
import {
  investmentReview,
  cancelConstruction,
  constructionRefund,
} from "../engine/systems/investmentReview";
import {
  buildFacility,
  processIndustrialEconomy,
} from "../engine/systems/industrialEconomy";
import {
  applyMembership,
  processWorldInstitutions,
  voteWorld,
  startOutreach,
  proposeAttack,
  membershipRequirements,
} from "../engine/systems/worldInstitutions";
import {
  changeRelations,
  addTreaty,
  relationFor,
} from "../engine/systems/diplomacy";
import { applyGameCommand } from "../engine/commands";
import { snapshotGame } from "../persistence/snapshot";
import { migrateSave } from "../persistence/migrations";
import {
  makeLongTermImportContract,
  processTradeDeals,
} from "../engine/systems/trade";
import {
  acceptAdvisorTradePact,
  acceptAdvisorContract,
} from "../engine/systems/advisor";
import { useGameStore } from "../store/gameStore";
const ready = () => {
  const s = makeInitialState();
  s.countries.TUR.politics.stability = 80;
  s.countries.TUR.diplomacy.reputation = 80;
  s.countries.TUR.economy.treasury = 200;
  s.council.influenceByCountry.TUR = 80;
  return s;
};
describe("investment decision integrity", () => {
  it("quotes before/after production and recurring costs without mutating treasury or construction", () => {
    const s = ready(),
      snap = snapshotGame(s),
      q = investmentReview(s, "coal_mine");
    expect(q.allowed).toBe(true);
    expect(q.metrics.find((m) => m[0] === "Additional running cost")?.[1]).toBe(
      "$0.002B/day",
    );
    expect(s).toEqual(snap);
  });
  it("charges once and adds a timed project only when commanded", () => {
    const s = ready(),
      n = buildFacility(s, "TUR", "coal_mine");
    expect(n.countries.TUR.economy.treasury).toBe(196);
    expect(n.industrialEconomy.TUR.projects).toHaveLength(1);
    expect(n.industrialEconomy.TUR.facilities.coal_mine).toBe(
      s.industrialEconomy.TUR.facilities.coal_mine,
    );
  });
  it("refunds unbuilt investment at 80%, and cannot refund twice", () => {
    const s = buildFacility(ready(), "TUR", "coal_mine"),
      id = s.industrialEconomy.TUR.projects[0].id;
    expect(constructionRefund(s, id)).toBe(3.2);
    const n = cancelConstruction(s, id);
    expect(n.countries.TUR.economy.treasury).toBeCloseTo(199.2);
    expect(cancelConstruction(n, id)).toBe(n);
  });
  it("refund falls as construction progresses and completed projects cannot be refunded", () => {
    const s = buildFacility(ready(), "TUR", "coal_mine"),
      id = s.industrialEconomy.TUR.projects[0].id;
    expect(constructionRefund({ ...s, day: 10 }, id)).toBeCloseTo(1.6);
    const done = processIndustrialEconomy({ ...s, day: 19 });
    expect(cancelConstruction(done, id)).toBe(done);
  });
  it("does not reuse an active project ID after cancelling an earlier project", () => {
    let s = buildFacility(ready(), "TUR", "coal_mine");
    s = buildFacility(s, "TUR", "coal_mine");
    s = cancelConstruction(s, s.industrialEconomy.TUR.projects[0].id);
    s = buildFacility(s, "TUR", "coal_mine");
    expect(
      new Set(s.industrialEconomy.TUR.projects.map((p) => p.id)).size,
    ).toBe(2);
  });
  it("revalidates funds at command time", () => {
    const s = ready();
    expect(investmentReview(s, "coal_mine").allowed).toBe(true);
    s.countries.TUR.economy.treasury = 0;
    expect(buildFacility(s, "TUR", "coal_mine")).toBe(s);
  });
});
describe("world membership and player voting", () => {
  it("requires achievements and spends influence once for an open application", () => {
    const s = ready(),
      n = applyMembership(s, "un");
    expect(n.world.ballots).toHaveLength(1);
    expect(n.council.influenceByCountry.TUR).toBe(75);
    expect(applyMembership(n, "un")).toBe(n);
    expect(applyMembership(s, "security")).toBe(s);
    expect(
      membershipRequirements(s, "security").filter((c) => !c.met).length,
    ).toBeGreaterThan(0);
  });
  it("counts a majority of cast yes/no votes, excludes abstentions and applies membership", () => {
    let s = applyMembership(ready(), "un");
    s.world.ballots[0].votes = {
      USA: "yes",
      GBR: "yes",
      CHN: "no",
      FRA: "abstain",
    };
    s = processWorldInstitutions({ ...s, day: 6 });
    expect(s.world.members.un).toContain("TUR");
    expect(s.world.ballots[0].status).toBe("passed");
  });
  it("rejects a tie and prevents retries for 30 days after closing", () => {
    let s = applyMembership(ready(), "un");
    s.world.ballots[0].votes = { USA: "yes", CHN: "no" };
    s = processWorldInstitutions({ ...s, day: 6 });
    expect(s.world.ballots[0].status).toBe("rejected");
    expect(applyMembership(s, "un")).toBe(s);
    expect(applyMembership({ ...s, day: 36 }, "un").world.ballots).toHaveLength(
      2,
    );
  });
  it("permits members to change a vote before close, but rejects outsiders and closed votes", () => {
    let s = ready();
    s.world.members.un.push("TUR");
    s = proposeAttack(s, "GRC");
    const id = s.world.ballots[0].id;
    s = voteWorld(s, id, "yes");
    expect(s.world.ballots[0].votes.TUR).toBe("yes");
    s = voteWorld(s, id, "no");
    expect(s.world.ballots[0].votes.TUR).toBe("no");
    expect(
      voteWorld({ ...s, day: 6 }, id, "yes").world.ballots[0].votes.TUR,
    ).toBe("no");
    const outsider = ready();
    expect(voteWorld(outsider, id, "yes")).toBe(outsider);
  });
  it("AI votes are deterministic and higher relationship/influence earns more support", () => {
    const a = ready(),
      b = ready();
    for (const c of Object.values(b.countries))
      b.countries[c.id].diplomacy.relations.TUR = {
        score: 100,
        status: "friendly",
        treaties: [],
        sanctions: false,
      };
    const n = applyMembership(a, "un"),
      again = applyMembership(a, "un"),
      better = applyMembership(b, "un");
    expect(n.world.ballots[0].votes).toEqual(again.world.ballots[0].votes);
    expect(
      Object.values(better.world.ballots[0].votes).filter((v) => v === "yes")
        .length,
    ).toBeGreaterThan(
      Object.values(n.world.ballots[0].votes).filter((v) => v === "yes").length,
    );
  });
  it("condemns attacks against a rejected proposal once, including opponents and target allies", () => {
    let s = ready();
    s.world.members.un.push("TUR");
    s = proposeAttack(s, "GRC");
    s.world.ballots[0].votes = { USA: "no", GBR: "no" };
    s = processWorldInstitutions({ ...s, day: 6 });
    s = addTreaty(s, "FRA", "GRC", "alliance");
    const score = relationFor(s.countries.TUR, "USA").score,
      rep = s.countries.TUR.diplomacy.reputation;
    const n = applyGameCommand(s, {
      type: "military/declareWar",
      targetCountryId: "GRC",
    });
    expect(n.world.ballots[0].condemned).toBe(true);
    expect(n.countries.TUR.diplomacy.reputation).toBe(rep - 18);
    expect(relationFor(n.countries.TUR, "USA").score).toBe(
      Math.max(-100, score - 20),
    );
    const again = applyGameCommand(n, {
      type: "military/declareWar",
      targetCountryId: "GRC",
    });
    expect(again.countries.TUR.diplomacy.reputation).toBe(
      n.countries.TUR.diplomacy.reputation,
    );
  });
  it("condemns an attack begun while the vote is still pending when rejection arrives", () => {
    let s = ready();
    s.world.members.un.push("TUR");
    s = proposeAttack(s, "GRC");
    s.world.ballots[0].votes = { USA: "no" };
    s = applyGameCommand(s, {
      type: "military/declareWar",
      targetCountryId: "GRC",
    });
    expect(s.world.ballots[0].condemned).not.toBe(true);
    s = processWorldInstitutions({ ...s, day: 6 });
    expect(s.world.ballots[0].condemned).toBe(true);
  });
});
describe("outreach, tutorial and compatible saves", () => {
  it("starts only with sufficient funds, relations and target cooldown", () => {
    let s = ready();
    s = changeRelations(s, "TUR", "GRC", 100);
    const n = startOutreach(s, "GRC", "islam");
    expect(n.countries.TUR.economy.treasury).toBe(198);
    expect(startOutreach(n, "GRC", "islam")).toBe(n);
    expect(startOutreach(s, "TUR", "islam")).toBe(s);
  });
  it("can succeed or fail, maintains normalized shares and applies effects only once", () => {
    let successes = 0,
      failures = 0;
    for (let seed = 1; seed <= 24; seed++) {
      let s = ready();
      s.simulationSeed = seed;
      s = changeRelations(s, "TUR", "GRC", 100);
      s = startOutreach(s, "GRC", "islam");
      s = processWorldInstitutions({ ...s, day: 31 });
      const m = s.world.missions[0];
      if (m.status === "success") {
        successes++;
        expect(m.effect).toBeGreaterThanOrEqual(0.1);
        expect(m.effect).toBeLessThanOrEqual(0.5);
      } else {
        failures++;
        expect(m.effect).toBe(0);
      }
      expect(
        Object.values(s.world.religiousShares.GRC).reduce<number>(
          (sum, v) => sum + (v ?? 0),
          0,
        ),
      ).toBeCloseTo(100);
      expect(processWorldInstitutions(s).world.religiousShares.GRC).toEqual(
        s.world.religiousShares.GRC,
      );
    }
    expect(successes).toBeGreaterThan(0);
    expect(failures).toBeGreaterThan(0);
  });
  it("migrates v13 without losing treasury, industry or contracts and persists new mechanics", () => {
    const s = ready(),
      old = { ...s, schemaVersion: 13 };
    delete (old as Partial<typeof old>).world;
    const migrated = migrateSave(old)!;
    expect(migrated.schemaVersion).toBe(16);
    expect(migrated.countries).toEqual(s.countries);
    expect(migrated.industrialEconomy).toEqual(s.industrialEconomy);
    expect(migrated.world.tutorial.active).toBe(false);
    expect(
      snapshotGame(applyMembership(migrated, "un")).world.ballots,
    ).toHaveLength(1);
  });
  it("starts ten-step onboarding for a new campaign and persists dismissal", () => {
    useGameStore
      .getState()
      .startCampaign({
        commanderName: "Test",
        countryId: "CAN",
        avatarId: "avatar-01",
        language: "tr",
      });
    let s = useGameStore.getState();
    expect(s.world.tutorial.active).toBe(true);
    expect(s.world.members.un).not.toContain("CAN");
    s.setTutorial(9, false);
    s = useGameStore.getState();
    expect(snapshotGame(s).world.tutorial).toEqual({
      step: 9,
      active: false,
      completed: true,
    });
    s.resetGame();
  });
});
describe("advisor contract integrity", () => {
  const supplier = () => {
    let s = ready();
    s = changeRelations(s, "TUR", "SAU", 100);
    s.activeAdvisor = {
      id: "test",
      resource: "oil",
      supplierId: "SAU",
      stage: "pact",
      createdDay: 1,
      message: "Test",
    };
    return s;
  };
  it("sends a pending pact proposal without charging or opening access", () => {
    const s = supplier(),
      p = acceptAdvisorTradePact(s);
    expect(p.countries.TUR.economy.treasury).toBe(200);
    expect(p.activeAdvisor).toBeNull();expect(p.world.living?.letters.some(x=>x.status==='pending')).toBe(true);
    expect(acceptAdvisorTradePact(p)).toBe(p);
  });
  it("opens a locked monthly contract with no immediate payment or stock transfer and blocks duplicates", () => {
    const s = {...addTreaty(supplier(),'TUR','SAU','trade'),activeAdvisor:{...supplier().activeAdvisor!,stage:'contract' as const}},
      n = acceptAdvisorContract(s, 1),
      c = Object.values(n.tradeDeals)[0];
    expect(c.deliveryIntervalDays).toBe(30);
    expect(n.countries.TUR.economy.treasury).toBe(
      s.countries.TUR.economy.treasury,
    );
    expect(n.countries.TUR.resources.oil).toBe(s.countries.TUR.resources.oil);
    expect(makeLongTermImportContract(n, "TUR", "SAU", "oil", 1)).toBeNull();
  });
  it("rejects absent trade access and pauses settlement when access is lost", () => {
    const s = supplier();
    expect(makeLongTermImportContract(s, "TUR", "SAU", "oil", 1)).toBeNull();
    let n = acceptAdvisorContract({...addTreaty(s,'TUR','SAU','trade'),activeAdvisor:{...s.activeAdvisor!,stage:'contract' as const}}, 1);
    const c = Object.values(n.tradeDeals)[0];
    n.countries.TUR.diplomacy.relations.SAU.treaties = [];
    const result = processTradeDeals({ ...n, day: c.nextDeliveryDay! });
    expect(result.countries.TUR.resources.oil).toBe(
      n.countries.TUR.resources.oil,
    );
  });
});
