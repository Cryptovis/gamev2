// Engine money stays in USD billions; presentation never changes save units.
export function money(billions: number) {
  if (!Number.isFinite(billions)) return "—";
  const v = Math.abs(billions),
    sign = billions < 0 ? "-" : "";
  if (v >= 1)
    return `${sign}$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
  if (v >= 0.001)
    return `${sign}$${(v * 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  if (v >= 0.000001)
    return `${sign}$${(v * 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })}K`;
  return `${sign}$${(v * 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
