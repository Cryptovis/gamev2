// Engine money stays in USD billions; presentation never changes save units.
export function compactMoney(billions: number, locale: string = 'en') {
  if (!Number.isFinite(billions)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1,
  }).format(billions * 1e9);
}

export function money(billions: number,locale: string='en') {
  if (!Number.isFinite(billions)) return "—";
  const v = Math.abs(billions),
    sign = billions < 0 ? "-" : "";
  if (v >= 1)
    return `${sign}$${v.toLocaleString(locale, { maximumFractionDigits: 2 })}B`;
  if (v >= 0.001)
    return `${sign}$${(v * 1000).toLocaleString(locale, { maximumFractionDigits: 2 })}M`;
  if (v >= 0.000001)
    return `${sign}$${(v * 1e6).toLocaleString(locale, { maximumFractionDigits: 2 })}K`;
  return `${sign}$${(v * 1e9).toLocaleString(locale, { maximumFractionDigits: 2 })}`;
}
