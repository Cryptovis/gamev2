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
        width: size,
        height: size,
        display: "inline-block",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        aria-hidden="true"
        alt=""
        src="/assets/command/civic-atlas-079.svg"
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
