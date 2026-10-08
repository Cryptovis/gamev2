import type { PlantKind } from "../../domain/energy";
// Small illustrated SVG scenes share the game's existing vector art approach.
export function PowerPlantArt({ kind }: { kind: PlantKind }) {
  return (
    <svg
      viewBox="0 0 120 76"
      role="img"
      aria-label={kind}
      className="power-plant-art"
    >
      <rect width="120" height="76" rx="10" fill="#14384b" />
      <circle cx="96" cy="17" r="10" fill="#f2cb72" />
      <path d="M0 56Q30 44 63 58T120 50V76H0" fill="#507755" />
      {kind === "solar" ? (
        <g fill="#376da1" stroke="#c0dcee">
          <path d="M14 38h35l-6 19H8zM64 38h35l-6 19H58z" />
          <path d="M19 39l-5 18m19-18-5 18m43-18-5 18m19-18-5 18M11 48h35m14 0h35" />
        </g>
      ) : kind === "wind" ? (
        <g stroke="#e8edf0" strokeWidth="3">
          <path d="M34 25v38m0-38L16 17m18 8 17-12m-17 12 2 20M79 34v30m0-30-18-8m18 8 17-12m-17 12 2 20" />
        </g>
      ) : kind === "hydro" ? (
        <>
          <path d="M19 25h56l12 35H10z" fill="#a5b5b9" />
          <path
            d="M31 29v26m17-26v26m17-26v26"
            stroke="#586e7d"
            strokeWidth="5"
          />
          <path
            d="M0 65q20-9 40 0t40 0 40 0"
            fill="none"
            stroke="#71c8e1"
            strokeWidth="8"
          />
        </>
      ) : kind === "nuclear" ? (
        <>
          <path
            d="M18 18h22l-5 16 9 28H9l12-28zM64 24h22l-5 14 10 24H56l11-24z"
            fill="#b4c1c5"
          />
          <circle cx="104" cy="50" r="9" fill="#f3d57c" />
          <path
            d="M104 43v14m-6-10 12 6m-12 0 12-6"
            stroke="#41453b"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          <rect
            x="14"
            y="40"
            width="84"
            height="22"
            rx="2"
            fill={kind === "coal" ? "#b78965" : "#779ba8"}
          />
          <path d="M22 40V17h10v23m31 0V24h10v16" fill="#beb9a5" />
          <path
            d="M27 15q-9-8 4-10m38 18q-9-8 4-10"
            fill="none"
            stroke="#d5e0df"
            strokeWidth="5"
            opacity=".65"
          />
          {kind === "coal" ? (
            <path d="m85 62 8-15 15 15z" fill="#283239" />
          ) : (
            <ellipse cx="105" cy="55" rx="8" ry="11" fill="#dbb054" />
          )}
        </>
      )}
    </svg>
  );
}
