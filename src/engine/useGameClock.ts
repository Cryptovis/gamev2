import {pendingVictory} from './systems/victory';
import { useEffect } from "react";
import { campaignInterval } from "./clock";
import { useGameStore } from "../store/gameStore";

export function useGameClock() {
  const tutorial = useGameStore((s) => s.world.tutorial.active);
  const autoWar = useGameStore((s) =>
    Object.values(s.wars).some(
      (w) =>
        w.autoAssault &&
        w.status === "active" &&
        (w.attackerId === s.playerCountryId ||
          w.defenderId === s.playerCountryId),
    ),
  );
  const blocked = useGameStore(
    (s) =>
      !!s.activeEvent ||
      !!s.activeAdvisor ||
      !!s.world.living?.advice.active || !!s.world.living?.notice || !!pendingVictory(s) ||
      !!s.actionReceipt ||
      s.campaignStatus !== "active",
  );
  const speed = useGameStore((state) => state.speed);
  const advanceDay = useGameStore((state) => state.advanceDay);

  useEffect(() => {
    const interval = campaignInterval(speed, autoWar, blocked, tutorial);
    if (interval === null || tutorial || blocked) return;

    const timer = window.setInterval(() => advanceDay(), interval);
    return () => window.clearInterval(timer);
  }, [advanceDay, speed, tutorial, autoWar, blocked]);
}
