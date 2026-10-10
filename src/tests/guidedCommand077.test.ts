import {withWarFuel} from './warFixture';
import { describe, it, expect, beforeEach } from "vitest";
import { makeInitialState } from "../data/initialState";
import {
  startProgram,
  processPrograms,
  PROGRAMS,
} from "../engine/systems/nationalPrograms";
import { useGameStore } from "../store/gameStore";
import { snapshotGame } from "../persistence/snapshot";
import { migrateSave } from "../persistence/migrations";
import { translateText } from "../i18n/localeText";
import { UI_CATALOG } from "../i18n/uiCatalog";
describe("guided command workspace", () => {
  beforeEach(() => useGameStore.getState().resetGame());
  it("replaces rail windows and country windows in both directions", () => {
    const s = useGameStore.getState();
    s.openTool("market");
    expect(useGameStore.getState().selectedCountryId).toBeNull();
    s.openTool("help");
    expect(useGameStore.getState().activeTool).toBe("help");
    s.selectCountry("GRC");
    expect(useGameStore.getState().activeTool).toBeNull();
    s.openTool("resources");
    expect(useGameStore.getState().selectedCountryId).toBeNull();
    s.closeWorkspace();
    expect(useGameStore.getState().activeTool).toBeNull();
  });
  it("opens the actual new war and closes the workspace", () => {
    const s = useGameStore.getState();
    s.openTool("market");
    useGameStore.setState(withWarFuel(useGameStore.getState()));
    s.declareWar("GRC");
    const next = useGameStore.getState();
    expect(next.warWindowId).toBeTruthy();
    expect(next.wars[next.warWindowId!].defenderId).toBe("GRC");
    expect(next.activeTool).toBeNull();
    expect(next.selectedCountryId).toBeNull();
    expect(next.actionReceipt).toBeNull();
  });
  it("keeps menu navigation transient when saving", () => {
    const s = useGameStore.getState();
    s.openTool("help");
    const saved = snapshotGame(useGameStore.getState());
    expect(saved).not.toHaveProperty("activeTool");
    expect(saved).not.toHaveProperty("warWindowId");
  });
});
describe("national programs", () => {
  it("charges once, rejects duplicates and applies benefits only on completion", () => {
    const initial = makeInitialState(),
      id = initial.playerCountryId,
      treasury = initial.countries[id].economy.treasury,
      unemployment = initial.countries[id].economy.unemployment;
    const started = startProgram(initial, "jobs");
    expect(started.countries[id].economy.treasury).toBe(treasury - 3);
    expect(startProgram(started, "jobs")).toBe(started);
    expect(processPrograms(started).countries[id].economy.unemployment).toBe(
      unemployment,
    );
    const complete = processPrograms({
      ...started,
      day: initial.day + PROGRAMS.jobs.days,
    });
    expect(complete.countries[id].economy.unemployment).toBe(
      Math.max(0, unemployment - 1),
    );
    expect(processPrograms(complete).countries[id]).toEqual(
      complete.countries[id],
    );
    expect(complete.world.programs![0].status).toBe("completed");
  });
  it("does not charge a treasury that cannot afford the program", () => {
    const s = makeInitialState();
    s.countries[s.playerCountryId].economy.treasury = 1;
    expect(startProgram(s, "health")).toBe(s);
  });
  it("preserves pending benefits across snapshot and migration", () => {
    const s = startProgram(makeInitialState(), "education"),
      saved = migrateSave(snapshotGame(s))!;
    expect(saved.world.programs).toEqual(s.world.programs);
    const next = processPrograms({
      ...saved,
      day: s.world.programs![0].readyDay,
    });
    expect(next.countries[s.playerCountryId].technology.researchPoints).toBe(
      s.countries[s.playerCountryId].technology.researchPoints + 12,
    );
  });
  it("accepts pre-program saves without changing their schema", () => {
    const s = makeInitialState();
    delete s.world.programs;
    expect(() => processPrograms(s)).not.toThrow();
    expect(processPrograms(s).schemaVersion).toBe(s.schemaVersion);
  });
});
describe("visible language catalog", () => {
  it("localizes setup headings, country names and resource enums without changing identifiers", () => {
    expect(translateText("tr", "Every era begins with a leader.")).toBe(
      "Her dönem bir liderle başlar.",
    );
    expect(translateText("tr", "Turkey")).toBe("Türkiye");
    expect(translateText("tr", "ARMOR_PLATE")).toBe("ZIRH PLAKASI");
    expect(translateText("tr", "$14.5B")).toBe("$14.5B");
    expect(translateText("en", "Turkey")).toBe("Türkiye");
  });
  it("contains four non-English translations for every catalog entry", () => {
    for (const values of Object.values(UI_CATALOG)) {
      expect(values).toHaveLength(4);
      expect(values.every((v) => v.trim().length > 0)).toBe(true);
    }
  });
  it("localizes all tutorial controls in all supported languages", () => {
    for (const language of ["tr", "es", "zh", "ru"])
      for (const text of [
        "Click the highlighted menu",
        "Click the highlighted tab",
        "Read the window, then click the highlighted X",
        "Step completed. Continue when ready.",
      ])
        expect(translateText(language, text)).not.toBe(text);
  });
});
