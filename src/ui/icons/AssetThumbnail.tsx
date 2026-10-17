import {AtlasImage} from './AtlasImage';
import {CivicArt} from './CivicArt';
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
const MODERN_RES_ICONS: Record<string, string> = {
  food: "/assets/command/res-food.png",
  oil: "/assets/command/res-oil.png",
  iron: "/assets/command/res-iron.png",
  uranium: "/assets/command/res-uranium.png",
  water: "/assets/command/res-water.png",
  gold: "/assets/command/res-gold.png",
  silver: "/assets/command/res-silver.png",
};

export function AssetThumbnail({
  asset,
  size = 48,
}: {
  asset: string;
  size?: number;
}) {
  const modernSrc = MODERN_RES_ICONS[asset];
  if (modernSrc) {
    return (
      <span
        className="asset-thumbnail asset-thumbnail-modern"
        role="img"
        aria-label={translateLive(asset.replaceAll("_", " "))}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: size,
          height: size,
        }}
      >
        <img
          src={modernSrc}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
          }}
        />
      </span>
    );
  }
  if (asset === "gold" || asset === "silver") return <CivicArt kind={asset} size={size} />;
  const i = Math.max(0, assets.indexOf(asset === "armor" ? "tanks" : asset));
  return (
    <span
      className="asset-thumbnail"
      role="img"
      aria-label={translateLive(asset.replaceAll("_", " "))}
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        position:'relative',overflow:'hidden',
      }}
    ><AtlasImage src="/assets/command/resource-atlas.webp" style={{position:'absolute',maxWidth:'none',width:size*5,height:size*5,left:-(i%5)*size,top:-Math.floor(i/5)*size}}/></span>
  );
}
