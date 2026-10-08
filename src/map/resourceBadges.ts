import type { CountryState } from "../domain/game";
import type { NationalIndustrialEconomy } from "../domain/industrial";
export function dominantResources(
  c: CountryState,
  n?: NationalIndustrialEconomy,
): string[] {
  const entries: Array<[string, number]> = [
    ["food", c.resourceProduction.food],
    ["oil", c.resourceProduction.oil * 1.7],
    ["iron", c.resourceProduction.iron],
    ["uranium", c.resourceProduction.uranium * 12],
  ];
  for (const [k, v] of Object.entries(n?.lastOutput ?? {}))
    if (v > 0)
      entries.push([
        k,
        v *
          (k === "gold"
            ? 100
            : k === "silver"
              ? 10
              : k === "rare_earths"
                ? 4
                : 1),
      ]);
  return entries
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([k]) => k);
}
