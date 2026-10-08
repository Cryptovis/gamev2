import { snapshotGame } from "../persistence/snapshot";
import { migrateSave } from "../persistence/migrations";
import { tickGame } from "../engine/tick";
import { describe, it, expect } from "vitest";
import { makeInitialState } from "../data/initialState";
import {
  createEnergy,
  processEnergy,
  buildPlant,
  togglePlant,
  processEnergyAI,
  energyDemand,
  cancelPowerProject,
  powerProjectRefund,
} from "../engine/systems/energy";
import { POWER_PLANTS } from "../data/powerPlants";
import { processIndustry } from "../engine/systems/industry";
import { translateText } from "../i18n/localeText";
import { NEWS_TEMPLATES } from "../i18n/newsTemplates";
import { dominantResources } from "../map/resourceBadges";
import { approximateLabelBox } from "../map/labelLayout";
function fixture() {
  const s = makeInitialState(),
    id = s.playerCountryId,
    c = s.countries[id];
  s.countries = { [id]: structuredClone(c) };
  s.industrialEconomy = { [id]: structuredClone(s.industrialEconomy[id]) };
  s.production = { [id]: structuredClone(s.production[id]) };
  s.world.energy = {
    [id]: {
      ...createEnergy(c),
      plants: { coal: 0, oil: 0, solar: 0, wind: 0, hydro: 0, nuclear: 0 },
    },
  };
  s.countries[id].industry.powerCapacity = 0;
  s.countries[id].processedResources.electricity = 0;
  return s;
}
describe("fuel-backed energy", () => {
  it("preserves funded projects through save/load without paying again", () => {
    let s = makeInitialState();
    s = buildPlant(s, s.playerCountryId, "solar");
    const restored = migrateSave(snapshotGame(s));
    expect(restored?.world.energy).toEqual(s.world.energy);
    expect(restored?.countries[s.playerCountryId].economy.treasury).toBe(
      s.countries[s.playerCountryId].economy.treasury,
    );
  });
  it("daily world tick invokes the energy engine for active countries", () => {
    const s = makeInitialState();
    const n = tickGame(s);
    expect(n.day).toBe(s.day + 1);
    expect(n.world.energy?.[s.playerCountryId].lastDemand).toBeGreaterThan(0);
    expect(Object.keys(n.world.energy ?? {})).toHaveLength(
      Object.keys(s.countries).length,
    );
  });

  it("unfinished cancellation refunds only unbuilt value and cannot repeat", () => {
    let s = fixture(),
      id = s.playerCountryId;
    const before = s.countries[id].economy.treasury;
    s = buildPlant(s, id, "solar");
    const project = s.world.energy![id].projects[0];
    s = { ...s, day: s.day + 20 };
    expect(powerProjectRefund(s, id, project.id)).toBeCloseTo(0.24);
    const n = cancelPowerProject(s, id, project.id);
    expect(n.countries[id].economy.treasury).toBeCloseTo(before - 0.6 + 0.24);
    expect(cancelPowerProject(n, id, project.id)).toBe(n);
    expect(
      powerProjectRefund({ ...s, day: project.readyDay }, id, project.id),
    ).toBe(0);
  });

  it("migrates generic capacity only once and does not mutate old saves", () => {
    const s = makeInitialState(),
      copy = structuredClone(s);
    const n = processEnergy(s);
    expect(s).toEqual(copy);
    const id = s.playerCountryId;
    expect(n.world.energy?.[id]).toBeDefined();
    const second = processEnergy(n);
    expect(second.world.energy?.[id].plants).toEqual(
      n.world.energy?.[id].plants,
    );
  });
  it("requires research, budget and valid construction kind", () => {
    const s = fixture(),
      id = s.playerCountryId;
    expect(buildPlant(s, id, "nuclear")).toBe(s);
    s.countries[id].economy.treasury = 0;
    expect(buildPlant(s, id, "coal")).toBe(s);
    expect(buildPlant(s, id, "invalid" as any)).toBe(s);
  });
  it("pays once; three project limit; output begins only on completion", () => {
    let s = fixture(),
      id = s.playerCountryId;
    const cash = s.countries[id].economy.treasury;
    s = buildPlant(s, id, "solar");
    expect(s.countries[id].economy.treasury).toBeCloseTo(
      cash - POWER_PLANTS.solar.cost,
    );
    expect(processEnergy(s).world.energy?.[id].plants.solar).toBe(0);
    s = processEnergy({ ...s, day: s.day + POWER_PLANTS.solar.days });
    expect(s.world.energy?.[id].plants.solar).toBe(1);
    expect(s.world.energy?.[id].projects).toHaveLength(0);
    expect(s.world.energy?.[id].lastGeneration).toBeGreaterThan(0);
    s = buildPlant(
      buildPlant(buildPlant(s, id, "wind"), id, "wind"),
      id,
      "wind",
    );
    expect(buildPlant(s, id, "wind")).toBe(s);
  });
  it("consumes real uranium and operating cash; no fuel means no nuclear output", () => {
    const s = fixture(),
      id = s.playerCountryId;
    s.world.energy![id].plants.nuclear = 1;
    s.countries[id].industry.powerCapacity = 2.4 / 0.018;
    s.countries[id].resources.uranium = 0.0015;
    const cash = s.countries[id].economy.treasury,
      n = processEnergy(s);
    expect(n.countries[id].resources.uranium).toBe(0);
    expect(n.world.energy![id].lastGeneration).toBeCloseTo(1.2);
    expect(n.world.energy![id].lastCosts).toBeCloseTo(0.00015);
    expect(n.countries[id].economy.treasury).toBeCloseTo(cash - 0.00015);
    expect(processEnergy(n).world.energy![id].lastGeneration).toBe(0);
  });
  it("pausing coal prevents consumption and free replacement generation", () => {
    const s = fixture(),
      id = s.playerCountryId;
    s.world.energy![id].plants.coal = 1;
    s.countries[id].industry.powerCapacity = 0.6 / 0.018;
    const stock = s.industrialEconomy[id].stock.coal,
      n = processEnergy(togglePlant(s, id, "coal"));
    expect(n.world.energy![id].lastGeneration).toBe(0);
    expect(n.industrialEconomy[id].stock.coal).toBe(stock);
  });
  it("shares finite fuel across plant operation and respects operating cash", () => {
    const s = fixture(),
      id = s.playerCountryId;
    s.world.energy![id].plants.oil = 2;
    s.countries[id].industry.powerCapacity = 1 / 0.018;
    s.countries[id].resources.oil = 0.12;
    s.countries[id].economy.treasury = 0.00005;
    const n = processEnergy(s);
    expect(n.countries[id].economy.treasury).toBeCloseTo(0);
    expect(n.countries[id].resources.oil).toBeCloseTo(0.06);
    expect(n.world.energy![id].lastGeneration).toBeCloseTo(0.25);
  });
  it("power shortage harms confidence, resets counter after recovery", () => {
    const s = fixture(),
      id = s.playerCountryId,
      c = s.countries[id],
      n = processEnergy(s);
    expect(n.world.energy![id].lastCoverage).toBe(0);
    expect(n.world.energy![id].outageDays).toBe(1);
    expect(n.countries[id].politics.approval).toBeLessThan(c.politics.approval);
    n.countries[id].processedResources.electricity = 1000;
    expect(processEnergy(n).world.energy![id].outageDays).toBe(0);
  });
  it("managed industry does not create electricity or burn uranium twice", () => {
    const s = fixture(),
      c = s.countries[s.playerCountryId];
    c.technology.unlocked.push("energy-nuclear");
    c.industry.powerCapacity = 100;
    c.processedResources.electricity = 10;
    const n = processIndustry(c, 1, true);
    expect(n.processedResources.electricity).toBe(10);
    expect(n.resources.uranium).toBe(c.resources.uranium);
  });
  it("reserves serve homes first and demand includes production lines", () => {
    const s = fixture(),
      id = s.playerCountryId;
    expect(energyDemand(s, id).total).toBeGreaterThan(
      energyDemand(s, id).civilian,
    );
    s.countries[id].processedResources.electricity = 3;
    const n = processEnergy(s);
    expect(n.countries[id].processedResources.electricity).toBeCloseTo(
      Math.max(0, 3 - energyDemand(s, id).civilian),
    );
  });
  it("annexed country is inactive", () => {
    const s = fixture(),
      id = s.playerCountryId;
    s.countries[id].annexedBy = "OTHER";
    expect(processEnergy(s).countries[id]).toEqual(s.countries[id]);
  });
  it("AI plans affordable capacity without using player treasury", () => {
    const s = makeInitialState();
    s.day = 14;
    for (const c of Object.values(s.countries)) {
      if (c.id === s.playerCountryId) continue;
      c.industry.powerCapacity = 0;
      s.world.energy = {
        ...s.world.energy,
        [c.id]: { ...createEnergy(c), lastDemand: 10 },
      };
    }
    const n = processEnergyAI(s);
    expect(n.countries[s.playerCountryId].economy.treasury).toBe(
      s.countries[s.playerCountryId].economy.treasury,
    );
    expect(
      Object.values(n.world.energy ?? {}).some((e) => e.projects.length > 0),
    ).toBe(true);
  });
});
describe("localization and resource overlays", () => {
  it("localizes dynamic reports including historical country names and numbers", () => {
    expect(
      translateText("tr", "Day 30: monthly strategic review completed."),
    ).toBe("Gün 30: aylık stratejik değerlendirme tamamlandı.");
    expect(
      translateText("tr", "TRADE // 3-year OIL contract opened with France."),
    ).toBe("TİCARET // Fransa ile 3 yıllık PETROL sözleşmesi açıldı.");
    expect(
      translateText("en", "Day 30: monthly strategic review completed."),
    ).toBe("Day 30: monthly strategic review completed.");
  });
  it("all authored news templates have a Turkish path", () => {
    for (const [source] of Object.entries(NEWS_TEMPLATES)) {
      const text = source.replace(/\{\d+\}/g, "France");
      expect(translateText("tr", text), source).not.toBe(text);
    }
  });
  it("translates whitespace fragments without losing separators", () => {
    expect(translateText("tr", " · ATTACK CONDEMNED")).toBe(
      " · SALDIRI KINANDI",
    );
    expect(translateText("tr", " Open Embassy in ")).toBe(" Büyükelçilik aç: ");
  });
  it("maps only positive actual production; icons reserve collision space", () => {
    const s = fixture(),
      c = s.countries[s.playerCountryId];
    c.resourceProduction = { food: 0, oil: 2, iron: 0, uranium: 0.01 };
    expect(dominantResources(c)).toEqual(["oil", "uranium"]);
    c.resourceProduction = { food: 0, oil: 0, iron: 0, uranium: 0 };
    expect(dominantResources(c)).toEqual([]);
    expect(
      approximateLabelBox({
        id: "TUR",
        text: "TURKEY",
        x: 20,
        y: 20,
        fontSize: 12,
        priority: 1,
        extraHeight: 28,
      }).height,
    ).toBeCloseTo(42.4);
  });
});
