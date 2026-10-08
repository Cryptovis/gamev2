import { translateLive } from "../../i18n/localeText";
const kinds = [
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
];
export function ResourceMapBadge({
  resource,
  x,
  y,
}: {
  resource: string;
  x: number;
  y: number;
}) {
  const i = kinds.indexOf(resource),
    cell = 1254 / 5;
  return (
    <g data-resource-badge={resource} transform={`translate(${x},${y})`}>
      <title>{translateLive(resource)}</title>
      <rect
        width="22"
        height="22"
        rx="5"
        fill="#152b31"
        stroke="#e0c47b"
        strokeWidth=".6"
      />
      {i >= 0 ? (
        <svg
          x="1"
          y="1"
          width="20"
          height="20"
          viewBox={`${(i % 5) * cell} ${Math.floor(i / 5) * cell} ${cell} ${cell}`}
          overflow="hidden"
        >
          <image
            href="/assets/command/resource-atlas.webp"
            width="1254"
            height="1254"
          />
        </svg>
      ) : (
        <text
          x="11"
          y="15"
          textAnchor="middle"
          fill={resource === "gold" ? "#f8d16c" : "#dce4e9"}
          fontSize="10"
        >
          {resource === "gold" ? "Au" : "Ag"}
        </text>
      )}
    </g>
  );
}
