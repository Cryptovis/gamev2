import { useEffect } from 'react';
import { getTickIntervalMs } from './clock';
import { useGameStore } from '../store/gameStore';

export function useGameClock() {
  const tutorial=useGameStore(s=>s.world.tutorial.active);
  const speed = useGameStore((state) => state.speed);
  const advanceDay = useGameStore((state) => state.advanceDay);

  useEffect(() => {
    const interval = getTickIntervalMs(speed);
    if (interval === null||tutorial) return;

    const timer = window.setInterval(() => advanceDay(), interval);
    return () => window.clearInterval(timer);
  }, [advanceDay, speed,tutorial]);
}
