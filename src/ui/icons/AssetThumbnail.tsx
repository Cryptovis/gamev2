import {LocaleText,translateLive} from '../../i18n/localeText';
const assets = [
  "food",
  "oil",
  "iron",
  "uranium",
  "water",
  "coal",
  "copper",
  "silicon",
  "aluminum",
  "rare_earths",
  "rubber",
  "armor_plate",
  "engines",
  "electronics",
  "steel",
  "fuel",
  "tanks",
  "fighters",
  "artillery",
  "naval",
  "infantry_equipment",
  "logistics",
  "factory",
  "electricity",
  "embassy",
];
export function AssetThumbnail({
  asset,
  size = 48,
}: {
  asset: string;
  size?: number;
}) {
  const i = Math.max(0, assets.indexOf(asset === "armor" ? "tanks" : asset));
  return (
    <span
      className="asset-thumbnail"
      role="img"
      aria-label={translateLive(asset.replaceAll("_", " "))}
      style={{
        width: size,
        height: size,
        position:'relative',overflow:'hidden',
      }}
    ><img alt="" aria-hidden="true" src="/assets/command/resource-atlas.svg" style={{position:'absolute',maxWidth:'none',width:size*5,height:size*5,left:-(i%5)*size,top:-Math.floor(i/5)*size}}/></span>
  );
}
