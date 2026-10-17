import {AtlasImage} from './AtlasImage';
const kinds = [
  "treasury",
  "budget",
  "approval",
  "stability",
  "overview",
  "economy",
  "production",
  "diplomacy",
  "military",
  "intel",
  "cabinet",
  "technology",
  "world",
  "war",
  "investment",
  "governance",
];
const HUD_ICONS: Record<string, string> = {
  treasury: "/assets/command/hud-treasury.png",
  food: "/assets/command/hud-food.png",
  oil: "/assets/command/hud-oil.png",
  approval: "/assets/command/hud-approval.png",
  stability: "/assets/command/hud-stability.png",
};

export function CommandArt({
  kind,
  size = 30,
}: {
  kind: string;
  size?: number;
}) {
  const hudSrc = HUD_ICONS[kind];
  if (hudSrc) {
    return (
      <span
        className="command-art command-art-hud"
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <img
          src={hudSrc}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
          }}
        />
      </span>
    );
  }
  const i = Math.max(0, kinds.indexOf(kind));
  return (
    <span
      className="command-art"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        position: "relative",
        overflow: "hidden",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <AtlasImage
        src="/assets/command/administration-atlas-078.svg"
        style={{
          position: "absolute",
          maxWidth: "none",
          width: size * 4,
          height: size * 4,
          left: -(i % 4) * size,
          top: -Math.floor(i / 4) * size,
        }}
      />
    </span>
  );
}
