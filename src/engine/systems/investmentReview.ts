import type { GameState } from "../../domain/game";
import type { FacilityKind } from "../../domain/industrial";
import { FACILITIES, GOODS } from "../../data/industrialCatalog";
import { goodStock } from "./industrialEconomy";
export function investmentReview(state: GameState, kind: FacilityKind) {
  const c = state.countries[state.playerCountryId],
    n = state.industrialEconomy[c.id],
    d = FACILITIES[kind];
  const potential = d.deposit
    ? n.potential[d.deposit]
    : d.output === "water"
      ? n.potential.water
      : d.output === "rubber"
        ? n.potential.rubber
        : 1;
  const extra =
    ((d.yield * potential * c.industry.utilization) / 100) *
    (state.day < state.leadership.celebrationUntilDay ? 1.12 : 1);
  const capacity = extra * n.facilities[kind];
  const warnings = [
    "Production estimate assumes sufficient inputs, power and cash. Operating expenses begin after completion.",
    d.description,
  ];
  if (!n.enabled[kind])
    warnings.push(
      "This facility group is paused. Resume it to obtain the projected output.",
    );
  if (d.tech && !c.technology.unlocked.includes(d.tech))
    warnings.push("Research required: " + d.tech);
  if (c.economy.treasury < d.cost) warnings.push("Insufficient treasury.");
  if (n.projects.length >= 6) warnings.push("Construction queue is full.");
  if (d.deposit && n.deposits[d.deposit] <= 0)
    warnings.push("Mineral deposit depleted.");
  for (const [good, amount] of Object.entries(d.inputs))
    if (
      goodStock(state, c.id, good as keyof typeof GOODS) <
      (amount ?? 0) * extra
    )
      warnings.push(
        "Low input stock: " + GOODS[good as keyof typeof GOODS].label,
      );
  if (c.processedResources.electricity < d.power)
    warnings.push(
      "Electricity reserves are insufficient for one day of operation.",
    );
  return {
    title: "Build " + d.label,
    summary: d.output
      ? "Expand " +
        GOODS[d.output].label +
        " supply. Inputs can be produced locally or purchased."
      : "Adds 5 factories and 1 refinery; assign production capacity after completion.",
    metrics: [
      ["Investment", `$${d.cost}B`],
      ["Treasury now", `$${c.economy.treasury.toFixed(3)}B`],
      ["After investment", `$${(c.economy.treasury - d.cost).toFixed(3)}B`],
      ["Construction", `${d.days} days · ready D${state.day + d.days}`],
      [
        "Existing capacity estimate",
        d.output
          ? `${capacity.toFixed(3)}/day`
          : `${c.industry.factories} factories`,
      ],
      [
        "Capacity after completion",
        d.output
          ? `${(capacity + extra).toFixed(3)}/day (+${extra.toFixed(3)})`
          : `${c.industry.factories + 5} factories`,
      ],
      [
        "Last actual output",
        d.output
          ? `${(n.lastOutput[d.output] ?? 0).toFixed(3)}/day`
          : "Not a resource producer",
      ],
      ["Additional running cost", `$${d.upkeep.toFixed(3)}B/day`],
      ["Additional power", `${d.power.toFixed(3)}/day`],
      [
        "Daily inputs",
        Object.entries(d.inputs)
          .map(
            ([g, a]) =>
              `${((a ?? 0) * extra).toFixed(3)} ${GOODS[g as keyof typeof GOODS].label}`,
          )
          .join(" + ") || "No material inputs",
      ],
    ],
    warnings,
    allowed:
      c.economy.treasury >= d.cost &&
      n.projects.length < 6 &&
      (!d.tech || c.technology.unlocked.includes(d.tech)) &&
      (!d.deposit || n.deposits[d.deposit] > 0),
  };
}
export function constructionRefund(state: GameState, id: string) {
  const p = state.industrialEconomy[state.playerCountryId].projects.find(
    (p) => p.id === id,
  );
  return p && p.readyDay > state.day
    ? FACILITIES[p.kind].cost *
        Math.min(
          1,
          Math.max(0, (p.readyDay - state.day) / FACILITIES[p.kind].days),
        ) *
        0.8
    : 0;
}
export function cancelConstruction(state: GameState, id: string): GameState {
  const refund = constructionRefund(state, id);
  if (!refund) return state;
  const c = state.countries[state.playerCountryId],
    n = state.industrialEconomy[c.id];
  return {
    ...state,
    countries: {
      ...state.countries,
      [c.id]: {
        ...c,
        economy: { ...c.economy, treasury: c.economy.treasury + refund },
      },
    },
    industrialEconomy: {
      ...state.industrialEconomy,
      [c.id]: { ...n, projects: n.projects.filter((p) => p.id !== id) },
    },
    sitrep: [
      `INDUSTRY // Construction cancelled; $${refund.toFixed(3)}B refunded.`,
      ...state.sitrep,
    ].slice(0, 12),
  };
}
