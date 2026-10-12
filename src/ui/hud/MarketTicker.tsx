import {LocaleText,translateLive} from '../../i18n/localeText';
import { useStoreView } from '../../store/useStoreView';
import { getMarketBoard } from '../../store/marketSelectors';
import { ResourceIcon } from '../icons/GameIcons';

export function MarketTicker() {
  // Only the displayed quotes are watched.
  const board = useStoreView((state) => getMarketBoard(state).map(({ resource, price }) => ({ resource, price })));
  return <div className="market-ticker" aria-label={translateLive("Global commodity market")}>
    <span className="market-title"><LocaleText value={"GLOBAL MARKET"}/></span>
    {board.map((item) => <span className="market-quote" key={item.resource}>
      <ResourceIcon resource={item.resource} size={13}/><b><LocaleText value={item.resource.toUpperCase()}/></b><strong><LocaleText value={"$"}/><LocaleText value={item.price.toFixed(3)}/></strong>
    </span>)}
  </div>;
}
