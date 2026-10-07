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
      aria-label={asset.replaceAll("_", " ")}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/assets/command/resource-atlas.svg)",
        backgroundSize: "500% 500%",
        backgroundPosition: `${(i % 5) * 25}% ${Math.floor(i / 5) * 25}%`,
      }}
    />
  );
}
