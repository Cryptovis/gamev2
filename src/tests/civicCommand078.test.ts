import { describe, it, expect } from "vitest";
import { makeInitialState } from "../data/initialState";
import {
  academyFor,
  buildCampus,
  hirePilots,
  processGovernance,
  governance,
  occupationFor,
  manageOccupation,
  acceptElectionOffer,
  fundPoliticalCampaign,
  politicalChance,
  pilotCoverage,
  CANDIDATES,
} from "../engine/systems/governance";
import { processIndustrialEconomy } from "../engine/systems/industrialEconomy";
import { campaignInterval } from "../engine/clock";
import { snapshotGame } from "../persistence/snapshot";
import { migrateSave } from "../persistence/migrations";
function occupied() {
  const s = makeInitialState();
  s.countries.SYR = {
    ...s.countries.SYR,
    controllerCountryId: s.playerCountryId,
  };
  return s;
}
function weak() {
  const s = makeInitialState();
  s.countries.SYR = {
    ...s.countries.SYR,
    politics: { ...s.countries.SYR.politics, approval: 15, stability: 20 },
    military: { ...s.countries.SYR.military, readiness: 20, logistics: 20 },
  };
  return s;
}
describe("single campaign clock", () => {
  it("runs player auto war at 2000 ms and respects pause, decisions and tutorial", () => {
    expect(campaignInterval(3, true)).toBe(2000);
    expect(campaignInterval(0, true)).toBeNull();
    expect(campaignInterval(3, true, true)).toBeNull();
    expect(campaignInterval(3, true, false, true)).toBeNull();
    expect(campaignInterval(3, false)).toBe(3000);
  });
});
describe("education and trained air crews", () => {
  it("charges construction upfront, applies it once at completion and charges upkeep", () => {
    const s = makeInitialState(),
      id = s.playerCountryId,
      before = s.countries[id].economy.treasury;
    const queued = buildCampus(s, "university");
    expect(queued.countries[id].economy.treasury).toBe(before - 5);
    expect(academyFor(queued, id).buildings.university).toBe(0);
    const done = processGovernance({ ...queued, day: s.day + 30 });
    expect(academyFor(done, id).buildings.university).toBe(1);
    expect(academyFor(done, id).projects).toHaveLength(0);
    expect(academyFor(done, id).lastUpkeep).toBeGreaterThanOrEqual(0.002);
    expect(
      academyFor(processGovernance({ ...done, day: done.day + 1 }), id)
        .buildings.university,
    ).toBe(1);
  });
  it("enforces research gates and treasury on campus construction", () => {
    const s = makeInitialState();
    s.countries[s.playerCountryId].technology.unlocked = [];
    expect(buildCampus(s, "institute")).toBe(s);
    expect(buildCampus(s, "academy")).toBe(s);
    s.countries[s.playerCountryId].economy.treasury = 1;
    expect(buildCampus(s, "university")).toBe(s);
  });
  it("takes pilots from a limited intake and finishes training before increasing coverage", () => {
    const s = makeInitialState(),
      id = s.playerCountryId,
      original = academyFor(s, id).pilots;
    s.countries[id].military.fighters += 100;
    expect(pilotCoverage(s, id)).toBeLessThan(1);
    const next = hirePilots(s, 50);
    expect(academyFor(next, id).pilots).toBe(original);
    expect(academyFor(next, id).training).toHaveLength(1);
    const complete = processGovernance({ ...next, day: next.day + 30 });
    expect(academyFor(complete, id).pilots).toBe(original + 50);
    expect(academyFor(processGovernance(complete), id).pilots).toBe(
      original + 50,
    );
  });
  it("rejects invalid and excessive recruitment", () => {
    const s = makeInitialState();
    expect(hirePilots(s, -1)).toBe(s);
    expect(hirePilots(s, 1.2)).toBe(s);
    expect(hirePilots(s, 1001)).toBe(s);
    s.countries[s.playerCountryId].military.personnel = 1;
    expect(hirePilots(s, 1)).toBe(s);
  });
  it("does not pay research bonuses when upkeep is underfunded", () => {
    const s = buildCampus(makeInitialState(), "university"),
      id = s.playerCountryId;
    s.countries[id].economy.treasury = 0;
    const complete = processGovernance({ ...s, day: s.day + 30 });
    expect(academyFor(complete, id).funded).toBe(false);
    expect(complete.countries[id].technology.researchPoints).toBe(
      s.countries[id].technology.researchPoints,
    );
  });
  it("migrates old saves with starting crews and preserves existing recruited pools", () => {
    const old = makeInitialState();
    delete old.world.governance;
    const migrated = migrateSave(snapshotGame(old))!;
    expect(academyFor(migrated, old.playerCountryId).pilots).toBe(
      old.countries[old.playerCountryId].military.fighters +
        old.countries[old.playerCountryId].military.bombers,
    );
    const trained = hirePilots(migrated, 10);
    expect(migrateSave(snapshotGame(trained))!.world.governance).toEqual(
      trained.world.governance,
    );
  });
});
describe("occupied territory governance", () => {
  it("raises unrest for shortages and transfers actual relief stocks only once per cooldown", () => {
    const s = occupied(),
      id = "SYR",
      p = s.playerCountryId;
    s.countries[id].resources.food = 0;
    s.countries[id].resources.oil = 0;
    const risk = processGovernance(s);
    expect(occupationFor(risk, id)!.unrest).toBeGreaterThan(35);
    const before = risk.countries[p].resources.food,
      relief = manageOccupation(risk, id, "relief");
    expect(relief.countries[p].resources.food).toBe(before - 20);
    expect(relief.countries[id].resources.food).toBe(20);
    expect(occupationFor(relief, id)!.unrest).toBeLessThan(
      occupationFor(risk, id)!.unrest,
    );
    expect(manageOccupation(relief, id, "relief")).toBe(relief);
  });
  it("charges military suppression and applies its explicit harms", () => {
    const s = occupied(),
      p = s.playerCountryId,
      original = s.countries[p],
      next = manageOccupation(s, "SYR", "suppress");
    expect(next.countries[p].economy.treasury).toBe(
      original.economy.treasury - 2,
    );
    expect(next.countries[p].military.readiness).toBe(
      original.military.readiness - 5,
    );
    expect(next.countries[p].diplomacy.reputation).toBe(
      original.diplomacy.reputation - 5,
    );
    expect(occupationFor(next, "SYR")!.policy).toBe("military");
  });
  it("reduces industrial output by 30% above the unrest threshold", () => {
    const s = occupied(),
      g = governance(s);
    s.world.governance = {
      ...g,
      occupations: {
        SYR: {
          controllerId: s.playerCountryId,
          unrest: 85,
          policy: "civil",
          lastActionDay: -10,
        },
      },
    };
    const unrest = processIndustrialEconomy(s);
    const peaceful = structuredClone(s);
    peaceful.world.governance!.occupations.SYR.unrest = 0;
    const full = processIndustrialEconomy(peaceful);
    expect(unrest.industrialEconomy.SYR.lastOutput.coal!).toBeCloseTo(
      full.industrialEconomy.SYR.lastOutput.coal! * 0.7,
      8,
    );
  });
  it("prevents foreign control actions and invalid recipients", () => {
    const s = occupied();
    expect(manageOccupation(s, "GRC", "suppress")).toBe(s);
    expect(manageOccupation(s, "SYR", "transfer", "SYR")).toBe(s);
    expect(manageOccupation(s, "SYR", "transfer", s.playerCountryId)).toBe(s);
    const next = manageOccupation(s, "SYR", "transfer", "GRC");
    expect(next.countries.SYR.controllerCountryId).toBe("GRC");
    expect(manageOccupation(next, "SYR", "relief")).toBe(next);
  });
  it("resolves a supported election deterministically, releases control and offers a treaty once", () => {
    const s = occupied(),
      start = manageOccupation(s, "SYR", "election"),
      support = manageOccupation(start, "SYR", "support", "civic");
    const ready = { ...support, day: s.day + 21 },
      complete = processGovernance(ready),
      again = processGovernance(ready);
    expect(complete).toEqual(again);
    expect(complete.countries.SYR.controllerCountryId).toBeNull();
    const e = governance(complete).occupations.SYR.election!;
    expect(e.resolved).toBe(true);
    expect(CANDIDATES.some((c) => c.id === e.winner)).toBe(true);
    const accepted = acceptElectionOffer(complete, "SYR");
    expect(
      accepted.countries[accepted.playerCountryId].diplomacy.relations.SYR
        .treaties,
    ).toContain(CANDIDATES.find((c) => c.id === e.winner)!.treaty);
    expect(acceptElectionOffer(accepted, "SYR")).toBe(accepted);
  });
  it("high unrest can cause independence while peaceful control remains stable", () => {
    let s = occupied();
    s.world.governance = {
      ...governance(s),
      occupations: {
        SYR: {
          controllerId: s.playerCountryId,
          unrest: 100,
          policy: "military",
          lastActionDay: 0,
        },
      },
    };
    let regained = false;
    for (let day = 0; day < 100; day++) {
      s = processGovernance({ ...s, day: s.day + 1 });
      if (!s.countries.SYR.controllerCountryId) {
        regained = true;
        break;
      }
    }
    expect(regained).toBe(true);
    const peaceful = processGovernance(occupied());
    expect(peaceful.countries.SYR.controllerCountryId).toBe(
      peaceful.playerCountryId,
    );
  });
});
describe("conditional foreign influence", () => {
  it("rejects strong governments and enforces funding, duration and cooldown", () => {
    const s = makeInitialState();
    expect(politicalChance(s, "GRC")).toBe(0);
    expect(fundPoliticalCampaign(s, "GRC")).toBe(s);
    const vulnerable = weak(),
      funded = fundPoliticalCampaign(vulnerable, "SYR");
    expect(funded.countries[funded.playerCountryId].economy.treasury).toBe(
      vulnerable.countries[vulnerable.playerCountryId].economy.treasury - 5,
    );
    expect(governance(funded).campaigns[0].chance).toBeGreaterThan(0);
    expect(governance(funded).campaigns[0].endsDay).toBe(vulnerable.day + 30);
    expect(fundPoliticalCampaign(funded, "SYR")).toBe(funded);
  });
  it("fails when the target recovers before completion", () => {
    const funded = fundPoliticalCampaign(weak(), "SYR");
    funded.countries.SYR.politics.approval = 70;
    const done = processGovernance({ ...funded, day: funded.day + 30 });
    expect(governance(done).campaigns[0].status).toBe("failed");
    expect(governance(done).foreignLeaders.SYR).toBeUndefined();
    expect(fundPoliticalCampaign(done, "SYR")).toBe(done);
  });
  it("persists active projects, occupations and influence campaigns through save/load", () => {
    const s = fundPoliticalCampaign(
      manageOccupation(buildCampus(weak(), "university"), "GRC", "relief"),
      "SYR",
    );
    expect(migrateSave(snapshotGame(s))!.world.governance).toEqual(
      s.world.governance,
    );
  });
});
