import {useMemo} from 'react';
import {useGameStore} from './gameStore';

type Store = ReturnType<typeof useGameStore.getState>;

/**
 * Subscribe to a small derived view of the store that is compared by value.
 * The selector runs on every store change (as the component body used to), but the component
 * re-renders only when the JSON form of what it displays changes. Use it for engine previews
 * and lists whose objects are rebuilt on every call; keep views small and serialisable.
 */
export function useStoreView<T>(select: (state: Store) => T): T {
  const json = useGameStore(state => JSON.stringify(select(state)) ?? 'null');
  return useMemo(() => JSON.parse(json) as T, [json]);
}
