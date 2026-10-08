import {AtlasImage} from './AtlasImage';
const tiles = [
  "festival",
  "sports",
  "food_relief",
  "letter",
  "gold",
  "silver",
  "war",
  "trade",
  "bloc",
] as const;
export function CivicArt({
  kind,
  size = 40,
}: {
  kind: (typeof tiles)[number];
  size?: number;
}) {
  const i = tiles.indexOf(kind);
  return (
    <span
      className="civic-art"
      role="img"
      aria-label={kind}
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AtlasImage
        src="/assets/command/civic-atlas-079.webp"
        style={{
          position: "absolute",
          maxWidth: "none",
          width: size * 3,
          height: size * 3,
          left: -(i % 3) * size,
          top: -Math.floor(i / 3) * size,
        }}
      />
    </span>
  );
}
