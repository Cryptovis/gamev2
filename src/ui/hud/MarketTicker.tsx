import {LocaleText,translateLive} from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { getMarketBoard } from '../../store/marketSelectors';
import { ResourceIcon } from '../icons/GameIcons';

export function MarketTicker() {
  const state = useGameStore();
  const board = getMarketBoard(state);
  return <div className="market-ticker" aria-label={translateLive("Global commodity market")}>
    <span className="market-title"><LocaleText value={"GLOBAL MARKET"}/></span>
    {board.map((item) => <span className="market-quote" key={item.resource}>
      <ResourceIcon resource={item.resource} size={13}/><b><LocaleText value={item.resource.toUpperCase()}/></b><strong><LocaleText value={"$"}/><LocaleText value={item.price.toFixed(3)}/></strong>
    </span>)}
  </div>;
}
