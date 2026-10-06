import { useGameStore } from '../../store/gameStore';
import { getMarketBoard } from '../../store/marketSelectors';
import { ResourceIcon } from '../icons/GameIcons';

export function MarketTicker() {
  const state = useGameStore();
  const board = getMarketBoard(state);
  return <div className="market-ticker" aria-label="Global commodity market">
    <span className="market-title">GLOBAL MARKET</span>
    {board.map((item) => <span className="market-quote" key={item.resource}>
      <ResourceIcon resource={item.resource} size={13}/><b>{item.resource.toUpperCase()}</b><strong>${item.price.toFixed(3)}</strong>
    </span>)}
  </div>;
}
