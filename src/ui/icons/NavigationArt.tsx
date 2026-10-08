import { LocaleText, translateLive } from "../../i18n/localeText";
const items = [
  "objectives",
  "world",
  "market",
  "map",
  "diplomacy",
  "alerts",
  "intel",
  "help",
  "military",
];
export function NavigationArt({
  kind,
  size = 36,
}: {
  kind: string;
  size?: number;
}) {
  const i = Math.max(0, items.indexOf(kind));
  return (
    <span
      className="navigation-art"
      role="img"
      aria-label={translateLive(kind)}
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        alt=""
        aria-hidden="true"
        src="/assets/command/navigation-atlas.svg"
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
