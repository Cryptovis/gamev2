/** Decorative power radar; the dossier itself displays the live campaign metrics. */
export function PowerChartIcon({size=30}:{size?:number}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" className="power-chart-icon">
    <path d="M24 3 44 18 36 42H12L4 18Z" fill="#152d3c" stroke="#dfc080" strokeWidth="2"/>
    <path d="M24 10 37 20 32 35H16L11 20Z M24 3V24M44 18 24 24 36 42M12 42 24 24 4 18" fill="none" stroke="#8ab9cb" strokeOpacity=".5"/>
    <path d="M24 9 37 20 29 35 16 34 12 21Z" fill="#dbb868" fillOpacity=".35" stroke="#f6d993" strokeWidth="1.5"/>
  </svg>;
}
