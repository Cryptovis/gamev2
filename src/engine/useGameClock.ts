import { useEffect } from "react";
import { activeClockInterval } from "./clockState";
import { useGameStore } from "../store/gameStore";
import { tickClockDay } from "../sim/storeSimulation";

export function useGameClock(enabled=true) {
  // Same pace rule as before (speed, player auto-war, blocking dialogs, tutorial), shared with the map's render clock.
  const interval = useGameStore(activeClockInterval);

  useEffect(() => {
    if (!enabled || interval === null) return;

    // 9.9: the day is computed in the simulation worker when there is one; otherwise this is the old synchronous advanceDay().
    const timer = window.setInterval(tickClockDay, interval);
    return () => window.clearInterval(timer);
  }, [enabled, interval]);
}
