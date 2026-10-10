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
export function CommandArt({
  kind,
  size = 30,
}: {
  kind: string;
  size?: number;
}) {
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
