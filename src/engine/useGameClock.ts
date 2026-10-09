import { useEffect } from "react";
import { activeClockInterval } from "./clockState";
import { useGameStore } from "../store/gameStore";

export function useGameClock(enabled=true) {
  // Same pace rule as before (speed, player auto-war, blocking dialogs, tutorial), shared with the map's render clock.
  const interval = useGameStore(activeClockInterval);
  const advanceDay = useGameStore((state) => state.advanceDay);

  useEffect(() => {
    if (!enabled || interval === null) return;

    const timer = window.setInterval(() => advanceDay(), interval);
    return () => window.clearInterval(timer);
  }, [enabled, advanceDay, interval]);
}
