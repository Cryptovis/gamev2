// Phase 9.5 stage 2: miniature architectural landmarks for the capital pins. Original 24x24 drawings in a shared
// three-tone isometric style (lit face, shaded face, accent) so they read as small 3D models at pin size.
// Colours come from CSS custom properties (livingWorld095.css) so Navy and Ivory restyle them without markup changes.
import type { ReactNode } from 'react';

export const LANDMARK_SIZE = 22;
const bar = (x: number, y: number, w: number, h: number, c = 'l') => <rect className={`lm-${c}`} x={x} y={y} width={w} height={h} />;
const poly = (d: string, c = 'l') => <path className={`lm-${c}`} d={d} />;
const line = (d: string) => <path className="lm-d" d={d} />;
const columns = (x0: number, x1: number, y0: number, y1: number, n: number) =>
  line(Array.from({ length: n }, (_, i) => { const x = x0 + ((x1 - x0) * i) / (n - 1); return `M${x.toFixed(2)} ${y0}V${y1}`; }).join(''));
const dome = (cx: number, base: number, r: number, c = 'a') => <path className={`lm-${c}`} d={`M${cx - r} ${base}a${r} ${r} 0 0 1 ${2 * r} 0z`} />;
const steps = (x: number, w: number) => <>{bar(x - 1, 20.6, w + 2, 1.6, 's')}{bar(x, 19.2, w, 1.5)}</>;

type Art = () => ReactNode;
export const LANDMARK_ART: Record<string, { id: string; art: Art }> = {
  // Turkey: Anitkabir, the colonnaded mausoleum with its four corner towers.
  TUR: { id: 'anitkabir', art: () => <>{steps(2, 20)}{bar(5, 11.5, 14, 7.7)}{poly('M19 11.5 21 12.8v7.2H19z', 's')}{columns(6.6, 17.4, 12.2, 19, 6)}{poly('M4 11.5 5.4 9.4h13.2L20 11.5z', 's')}{bar(5.4, 8.6, 13.2, 1.2)}{bar(2.4, 6.2, 3, 7.4)}{bar(18.6, 6.2, 3, 7.4)}{poly('M2.2 6.2 3.9 3.8l1.7 2.4z', 'a')}{poly('M18.4 6.2l1.7-2.4 1.7 2.4z', 'a')}</> },
  // France: the Eiffel Tower.
  FRA: { id: 'eiffel', art: () => <>{poly('M12 .6l.7 5.4h-1.4z', 'd')}{poly('M11.3 6h1.4l.9 5.2h-3.2z', 's')}{bar(9.6, 11.2, 4.8, 1, 'a')}{poly('M10 12.2h4l1.2 4.4h-6.4z', 'l')}{bar(8.8, 16.6, 6.4, 1, 'a')}{poly('M8.8 17.6h6.4l3.4 3.8h-3l-3.2-2.4-3.2 2.4h-3z', 'l')}{poly('M12 14.6l1.4 3.2-1.4 1.2-1.4-1.2z', 'd')}{poly('M10.4 21.4v-1.6c0-1 .7-1.7 1.6-2.4.9.7 1.6 1.4 1.6 2.4v1.6z', 'd')}{poly('M13.6 21.4v-1.6c0-1-.7-1.7-1.6-2.4.9-.1 3.2 1.8 3.4 4z', 's')}{bar(4.8, 21.2, 14.4, 1, 's')}{line('M10.6 8.4l2.8 2.6M13.4 8.4l-2.8 2.6M10.8 13.6l2.4 2.4M13.2 13.6l-2.4 2.4')}</> },
  // United Kingdom: the Elizabeth Tower and the Palace of Westminster.
  GBR: { id: 'bigben', art: () => <>{bar(1.6, 15.5, 11, 5.8)}{line('M3 16.5v4M5 16.5v4M7 16.5v4M9 16.5v4M11 16.5v4')}{bar(1.4, 14.6, 11.4, 1.2, 's')}{bar(14, 7.5, 5.6, 13.8)}{poly('M19.6 7.5 21 8.6v12.7h-1.4z', 's')}{bar(13.6, 6.2, 6.4, 1.6, 'a')}{poly('M14.2 6.2l2.6-5.4 2.6 5.4z', 'a')}<circle className="lm-f" cx="16.8" cy="11" r="2.1" />{line('M16.8 9.6V11l1 .6')}{bar(15.2, 14.6, 3.2, .8, 'a')}</> },
  // United States: the White House portico and wings.
  USA: { id: 'whitehouse', art: () => <>{bar(1.4, 14.2, 21.2, 6.6)}{poly('M22.6 14.2l.6 1v5.6l-.6 0z', 's')}{bar(7.4, 11.6, 9.2, 9.2, 'l')}{poly('M6.6 11.6 12 8.4l5.4 3.2z', 's')}{columns(8.4, 15.6, 12.6, 20.4, 5)}{dome(12, 8.6, 2.2, 's')}{bar(11.8, 4.6, .5, 1.8, 'd')}{line('M2.8 16.4h3M2.8 18.6h3M18.2 16.4h3M18.2 18.6h3')}{bar(.8, 20.8, 22.4, 1.2, 'g')}</> },
  // Russia: a Kremlin wall, the red-starred gate tower and onion domes.
  RUS: { id: 'kremlin', art: () => <>{bar(1, 15, 22, 6, 'r')}{line('M1 15v-1.2h1.4V15M4 15v-1.2h1.4V15M7 15v-1.2h1.4V15M16 15v-1.2h1.4V15M19 15v-1.2h1.4V15M22 15v-1.2')}{bar(9.6, 9.2, 4.8, 12, 'r')}{poly('M14.4 9.2 15.4 10v11.2h-1z', 's')}{poly('M9 9.2l3-3.6 3 3.6z', 'a')}{poly('M12 5.6 12.7 .6 11.3 .6z', 'd')}<circle className="lm-a" cx="12" cy="2.4" r=".9" />{bar(11.2, 12.2, 1.6, 2.2, 'f')}<path className="lm-a" d="M3.2 15c-1.6-1.2-1.4-4 .6-5.6 2 1.6 2.2 4.4.6 5.6z" /><path className="lm-b" d="M18.6 15c-1.6-1.2-1.4-4 .6-5.6 2 1.6 2.2 4.4.6 5.6z" /></> },
  // China: the triple-roofed Temple of Heaven on its marble terrace.
  CHN: { id: 'temple-heaven', art: () => <>{bar(2.6, 19.6, 18.8, 2.2, 's')}{bar(4, 17.8, 16, 2)}{bar(5.6, 16.2, 12.8, 1.8, 's')}{bar(8.2, 12.6, 7.6, 3.8, 'r')}{line('M9.6 13v3M12 13v3M14.4 13v3')}{poly('M6.6 12.8c1.6-.4 3.6-1.4 5.4-3 1.8 1.6 3.8 2.6 5.4 3z', 'b')}{poly('M8 9.4c1.4-.2 2.8-1 4-2.4 1.2 1.4 2.6 2.2 4 2.4z', 'b')}{poly('M9.6 6.2c.8-.2 1.6-.8 2.4-1.8.8 1 1.6 1.6 2.4 1.8z', 'b')}{poly('M12 4.4 12.5 1.4 11.5 1.4z', 'a')}</> },
  // Japan: a torii gate before the Tokyo Tower.
  JPN: { id: 'torii', art: () => <>{poly('M16.4 1.4l.9 4.6h-1.8z', 'd')}{poly('M15.5 6h1.8l1.2 5.4h-4.2z', 'r')}{bar(14.2, 11.2, 4.6, .8, 'a')}{poly('M14.6 12l-1.4 8.4h1.6l1.6-6.4 1.6 6.4h1.6L18 12z', 'r')}{poly('M.8 7.4c3 .6 6.2.2 9.4-1.6l-.6 1.8c-3 1.6-6.4 2-9.2 1.2z', 'd')}{bar(1.8, 9, 7.6, 1, 'r')}{bar(2.8, 10, 1.2, 10.4, 'r')}{bar(7, 10, 1.2, 10.4, 'r')}{bar(1.6, 12.4, 7.8, .9, 'd')}{bar(1, 20.4, 22, 1.4, 's')}</> },
  // Germany: the Brandenburg Gate with its quadriga.
  DEU: { id: 'brandenburg', art: () => <>{bar(1.6, 9.8, 20.8, 2.4, 's')}{bar(2.6, 12.2, 18.8, 8.4)}{columns(4.2, 19.8, 12.6, 20.6, 6)}{poly('M21.4 12.2l1.2.8v7.6l-1.2 0z', 's')}{bar(1.2, 20.6, 21.6, 1.4, 's')}{bar(9.6, 6.6, 4.8, 3.2, 'a')}{poly('M8.6 7.2l1-2.6 1 2.6zM10.8 6.4l1.2-3.6 1.2 3.6zM13.4 7.2l1-2.6 1 2.6z', 'a')}<circle className="lm-d" cx="12" cy="2" r=".6" /></> },
  // Italy: the Colosseum.
  ITA: { id: 'colosseum', art: () => <>{poly('M1.4 21.4V9.6c0-2 4.6-3.6 10.6-3.6s10.6 1.6 10.6 3.6v11.8z', 'l')}{poly('M16 6.6c3.8.4 6.6 1.6 6.6 3v11.8h-4.6z', 's')}{line('M1.4 11.6c2 1.2 5.6 2 10.6 2s8.6-.8 10.6-2M1.4 16.2c2 1.2 5.6 2 10.6 2s8.6-.8 10.6-2')}{line('M4 12.8v3.2M6.8 13.4v3M9.6 13.8v3M12.4 13.8v3M15.2 13.6v3M18 13.2v3M4 17.6v3M6.8 18.2v2.8M9.6 18.6v2.6M12.4 18.6v2.6M15.2 18.4v2.6M18 18v2.8')}{bar(4.6, 8, 14.8, 0, 'd')}</> },
  // Egypt: the pyramids of Giza.
  EGY: { id: 'pyramids', art: () => <>{poly('M12.6 21.4 18.4 6.6l5.6 14.8z', 'l')}{poly('M18.4 6.6l5.6 14.8h-4z', 's')}{poly('M.4 21.4 8 3.4l7.6 18z', 'l')}{poly('M8 3.4l7.6 18H11.2z', 's')}{poly('M-.6 21.4h25v1.2h-25z', 'g')}{line('M3.2 15.4h9.6M5 11.4h6M10.4 18.4l2-4')}</> },
  // India: India Gate.
  IND: { id: 'indiagate', art: () => <>{bar(3, 9.4, 18, 11.4)}{poly('M21 9.4l1.4 1.2v10.2H21z', 's')}{bar(2.2, 7.8, 19.6, 1.8, 's')}{bar(1.6, 20.8, 20.8, 1.2, 's')}<path className="lm-d" d="M8.6 20.8v-6.4a3.4 3.4 0 0 1 6.8 0v6.4z" />{line('M4.4 12h2.4M17.2 12h2.4M4.4 15h2.4M17.2 15h2.4')}{bar(11.8, 4.4, .5, 3.4, 'a')}{poly('M12.3 4.6l3.2 1.2-3.2 1.2z', 'a')}</> },
  // Brazil: the twin towers and bowls of the National Congress in Brasilia.
  BRA: { id: 'brasilia', art: () => <>{bar(1, 19.6, 22, 2, 's')}{bar(3.4, 17.4, 17.2, 2.2)}{poly('M5 17.4a5 3 0 0 1 10 0z', 's')}{poly('M10.6 17.4a5 3 0 0 0 10 0z', 'a')}{bar(9.2, 2.4, 2.4, 15, 'l')}{bar(12.4, 2.4, 2.4, 15, 'l')}{poly('M11.6 2.4h.8v15h-.8z', 's')}{poly('M14.8 2.4h.8v15h-.8z', 's')}{line('M9.2 6h2.4M9.2 10h2.4M9.2 14h2.4M12.4 6h2.4M12.4 10h2.4M12.4 14h2.4')}</> },
  // Greece: the Parthenon.
  GRC: { id: 'parthenon', art: () => <>{steps(2, 20)}{bar(3.4, 11, 17.2, 8.4)}{poly('M20.6 11l1.4 1v7.4h-1.4z', 's')}{columns(4.4, 19.6, 11.6, 19.4, 8)}{poly('M2.4 11 12 5.6 21.6 11z', 'l')}{poly('M12 5.6 21.6 11h-3.8z', 's')}{bar(2.4, 10.8, 19.2, 1.2, 's')}</> },
  // Canada: the Peace Tower and Centre Block.
  CAN: { id: 'peacetower', art: () => <>{bar(1.2, 14.4, 21.6, 6.8)}{poly('M22.8 14.4l.4 1v6.4l-.4 0z', 's')}{line('M2.6 16.4v4.4M4.6 16.4v4.4M6.6 16.4v4.4M17.4 16.4v4.4M19.4 16.4v4.4M21 16.4v4.4')}{bar(.8, 13.6, 22.4, 1, 'a')}{bar(9.4, 6.4, 5.2, 14.8)}{poly('M14.6 6.4l1 .8v14h-1z', 's')}<circle className="lm-f" cx="12" cy="10.2" r="1.6" />{poly('M8.8 6.4 12 .6l3.2 5.8z', 'b')}{bar(11.8, -.4, .4, 1.4, 'd')}</> },
  // Mexico: the Angel of Independence column.
  MEX: { id: 'angel', art: () => <>{bar(2.6, 19.4, 18.8, 2.4, 's')}{bar(4.4, 17.4, 15.2, 2)}{bar(6.6, 15.4, 10.8, 2, 's')}{bar(10, 5.4, 4, 10)}{poly('M14 5.4l1 .6v9.4h-1z', 's')}{bar(9, 4.2, 6, 1.4, 'a')}<circle className="lm-a" cx="12" cy="2.6" r="1.1" />{poly('M12 3.6 6.8 1.2 10.2 4.8zM12 3.6 17.2 1.2 13.8 4.8z', 'a')}{line('M10 8h4M10 11h4')}</> },
  // Iran: the Azadi Tower.
  IRN: { id: 'azadi', art: () => <>{bar(1.4, 20.4, 21.2, 1.6, 's')}{poly('M3 20.4V12c0-1.2.4-2.2 1.2-2.8L9 6.6h6l4.8 2.6c.8.6 1.2 1.6 1.2 2.8v8.4h-3.4V13.4c0-1.6-1.6-3-5.6-3s-5.6 1.4-5.6 3v7z', 'l')}{poly('M15 6.6l4.8 2.6c.8.6 1.2 1.6 1.2 2.8v8.4h-3.4V13.4c0-1-.5-1.8-1.5-2.4z', 's')}{poly('M8.4 6.6 12 1.8l3.6 4.8z', 'b')}{poly('M12 1.8 12.4 .4h-.8z', 'd')}{line('M12 6.6v4')}</> },
  // Saudi Arabia: the Kingdom Centre with its open crown.
  SAU: { id: 'kingdom', art: () => <>{bar(1.4, 20.6, 21.2, 1.4, 's')}{poly('M5.6 20.6 7 3.4c.4-1.4 3-1.6 5-1.6s4.6.2 5 1.6l1.4 17.2z', 'l')}{poly('M12 1.8c2 0 4.6.2 5 1.6l1.4 17.2H14.4z', 's')}<path className="lm-d" d="M9 3.2a3 2 0 0 1 6 0z" />{line('M7.4 8h9.2M7 12h10M6.6 16h10.8')}</> },
  // Indonesia: the National Monument with its golden flame.
  IDN: { id: 'monas', art: () => <>{bar(1.6, 20.4, 20.8, 1.6, 's')}{bar(3, 18.4, 18, 2.2)}{bar(4.6, 16.2, 14.8, 2.2, 's')}{bar(7.6, 13.4, 8.8, 2.8, 'l')}{poly('M10.6 13.4h2.8l.8-11.2h-4.4z', 'l')}{poly('M13.4 13.4h-.4l.2-11.2h1z', 's')}{bar(9.2, 8.6, 5.6, 1.1, 'a')}<path className="lm-a" d="M12 .2c1.4 1.6 1.8 2.6 1.1 3.6-.4.5-1.8.5-2.2 0C10.2 2.8 10.6 1.8 12 .2z" /></> },
  // South Korea: Sungnyemun (Namdaemun) gate.
  KOR: { id: 'namdaemun', art: () => <>{bar(1.4, 15.4, 21.2, 5.8, 's')}<path className="lm-d" d="M8.8 21.2v-3.6a3.2 3.2 0 0 1 6.4 0v3.6z" />{line('M1.4 17.4h5M17.6 17.4h5')}{bar(4.4, 9.8, 15.2, 5.6)}{line('M6.6 10.4v4.6M9 10.4v4.6M12 10.4v4.6M15 10.4v4.6M17.4 10.4v4.6')}{poly('M1.6 15.6c3-.6 4.6-1.6 5.4-3.2h10c.8 1.6 2.4 2.6 5.4 3.2z', 'b')}{poly('M3.4 9.8c2.6-.4 4-1.2 4.8-2.6h7.6c.8 1.4 2.2 2.2 4.8 2.6z', 'b')}{bar(9.2, 6.4, 5.6, 0, 'd')}</> },
  // Pakistan: the Faisal Mosque, a tent-shaped hall with four minarets.
  PAK: { id: 'faisal', art: () => <>{bar(1, 20.6, 22, 1.4, 's')}{poly('M5.4 20.6 12 6.6l6.6 14z', 'l')}{poly('M12 6.6l6.6 14h-4.4z', 's')}{line('M12 6.6l-2.2 14M12 6.6l2.2 14')}{bar(1.8, 5.4, 1.4, 15.2, 'a')}{bar(20.8, 5.4, 1.4, 15.2, 'a')}{poly('M1.6 5.4l.9-3.2.9 3.2zM20.6 5.4l.9-3.2.9 3.2z', 'a')}{bar(5.2, 11.4, 1, 9.2, 's')}{bar(17.8, 11.4, 1, 9.2, 's')}</> },
  // Poland: the stepped Palace of Culture and Science.
  POL: { id: 'palace-culture', art: () => <>{bar(1.4, 20.4, 21.2, 1.6, 's')}{bar(2.4, 14.4, 19.2, 6.2)}{poly('M21.6 14.4l.8.8v5.2h-.8z', 's')}{line('M4 15.6v4.2M6.4 15.6v4.2M17.6 15.6v4.2M20 15.6v4.2')}{bar(7.2, 9.6, 9.6, 4.8, 'l')}{poly('M16.8 9.6l.8.6v4.2h-.8z', 's')}{bar(9.2, 5.2, 5.6, 4.4, 'l')}{poly('M14.8 5.2l.8.6v3.8h-.8z', 's')}{poly('M10 5.2 12 2.4l2 2.8z', 'a')}{poly('M12 2.4 12.4.2h-.8z', 'd')}<circle className="lm-f" cx="12" cy="7.4" r="1.2" /></> },
  // Thailand: a gilded chedi of the Grand Palace.
  THA: { id: 'chedi', art: () => <>{bar(2.4, 19.8, 19.2, 2.2, 's')}{bar(4.2, 17.6, 15.6, 2.4)}{poly('M6.4 17.6h11.2L15.4 13H8.6z', 'a')}{poly('M8.6 13h6.8L14 9.6h-4z', 'l')}{poly('M10 9.6h4L12.8 6.4h-1.6z', 'a')}{poly('M12 .4l.8 6h-1.6z', 'a')}{poly('M12.4 9.6l1.6 0-.6 3.4h-.6z', 's')}{line('M7.4 15.4h9.2M9.4 11.4h5.2')}</> },
  // United Arab Emirates: the white domes of the Sheikh Zayed Mosque.
  ARE: { id: 'zayed', art: () => <>{bar(1, 20.6, 22, 1.4, 's')}{bar(4, 14.6, 16, 6)}{poly('M20 14.6l1.2.8v5.2H20z', 's')}{line('M5.8 16v4.2M8 16v4.2M10.2 16v4.2M13.8 16v4.2M16 16v4.2M18.2 16v4.2')}{dome(12, 14.6, 4.6, 'l')}{poly('M12 10a4.6 4.6 0 0 1 4.6 4.6H12z', 's')}{dome(6.2, 14.6, 2, 'l')}{dome(17.8, 14.6, 2, 'l')}{bar(11.8, 7.6, .5, 2.4, 'a')}{bar(1.4, 6, 1.4, 14.6, 'a')}{bar(21.2, 6, 1.4, 14.6, 'a')}{poly('M1.2 6l.9-2.6.9 2.6zM21 6l.9-2.6.9 2.6z', 'a')}</> },
  // Argentina: the Obelisk of Buenos Aires.
  ARG: { id: 'obelisco', art: () => <>{bar(5, 20.6, 14, 1.4, 's')}{poly('M9.6 20.6 10.8 4h2.4l1.2 16.6z', 'l')}{poly('M12.6 20.6 13.2 4h.6l.6 16.6z', 's')}{poly('M10.8 4 12 .4 13.2 4z', 'a')}{line('M10.6 17h2.8')}</> },
  // Ukraine: the golden domes of St Sophia, Kyiv.
  UKR: { id: 'stsophia', art: () => <>{bar(1.6, 20.6, 20.8, 1.4, 's')}{bar(3.4, 12.6, 17.2, 8)}{poly('M20.6 12.6l1 .7v7.3h-1z', 's')}{line('M5.4 14v6.4M8 14v6.4M16 14v6.4M18.6 14v6.4')}<path className="lm-d" d="M10.4 20.6v-3a1.6 1.6 0 0 1 3.2 0v3z" />{bar(9, 8.4, 6, 4.2, 'l')}<path className="lm-a" d="M9.6 8.4c-1.4-1.6-1-4.4 2.4-6.2 3.4 1.8 3.8 4.6 2.4 6.2z" /><path className="lm-a" d="M3.4 12.6c-1.2-1.2-.8-3.4 1.8-4.8 2.6 1.4 3 3.6 1.8 4.8z" /><path className="lm-a" d="M17 12.6c-1.2-1.2-.8-3.4 1.8-4.8 2.6 1.4 3 3.6 1.8 4.8z" />{poly('M12 2.2 12.4.4h-.8z', 'd')}</> },
  // South Africa: the Union Buildings' curved colonnade and twin towers.
  ZAF: { id: 'union', art: () => <>{bar(1, 20.6, 22, 1.4, 'g')}{poly('M2.6 20.6V15c0-2.2 4.4-3.8 9.4-3.8s9.4 1.6 9.4 3.8v5.6z', 'l')}{poly('M16.6 11.5c2.8.5 4.8 1.7 4.8 3.5v5.6h-3.4z', 's')}{line('M4.4 15.6v4.8M6.6 14.8v5.6M8.8 14.4v6M11 14.2v6.2M13 14.2v6.2M15.2 14.4v6M17.4 14.8v5.6M19.6 15.6v4.8')}{bar(2, 6.6, 3.2, 8.6)}{bar(18.8, 6.6, 3.2, 8.6)}{poly('M1.6 6.6l2-3.4 2 3.4zM18.4 6.6l2-3.4 2 3.4z', 'b')}</> },
  // Kazakhstan: the Baiterek tower with its golden sphere.
  KAZ: { id: 'baiterek', art: () => <>{bar(5, 20.6, 14, 1.4, 's')}{poly('M10.6 20.6 11.2 11h1.6l.6 9.6z', 'l')}{poly('M12.8 11l.6 9.6h-.8z', 's')}{line('M7.4 17.6c1.4-4 3-6.4 4.6-7.2M16.6 17.6c-1.4-4-3-6.4-4.6-7.2M5.6 20c2-5 4.2-8 6.4-9.6M18.4 20c-2-5-4.2-8-6.4-9.6')}<circle className="lm-a" cx="12" cy="6" r="4.2" />{poly('M12 6a4.2 4.2 0 0 1 0 4.2 4.2 4.2 0 0 1 0-8.4z', 'a')}<circle className="lm-f" cx="12" cy="6" r="2.2" />{poly('M12 1.8 12.4.2h-.8z', 'd')}</> },
  // Malaysia: the Petronas Towers.
  MYS: { id: 'petronas', art: () => <>{bar(1.4, 20.8, 21.2, 1.2, 's')}{poly('M3.4 20.8V9l2.4-2.6 2.4 2.6v11.8z', 'l')}{poly('M15.8 20.8V9l2.4-2.6 2.6 2.6v11.8z', 'l')}{poly('M8.2 9 5.8 6.4V9z', 's')}{poly('M20.8 9 18.2 6.4V9z', 's')}{poly('M5.8 6.4l.7-3.2h-1.4zM18.2 6.4l.7-3.2h-1.4z', 'a')}{poly('M5.8 3.2 6.1.2h-.6zM18.2 3.2l.3-3h-.6z', 'd')}{bar(8.2, 13, 7.6, 1.8, 'a')}{line('M4.2 12h3.2M4.2 15.4h3.2M4.2 18.4h3.2M16.6 12h3.2M16.6 15.4h3.2M16.6 18.4h3.2')}</> },
  // Spain: the Puerta de Alcala arch in Madrid.
  ESP: { id: 'alcala', art: () => <>{bar(1.8, 20.6, 20.4, 1.4, 's')}{bar(3.4, 9.6, 17.2, 11)}{poly('M20.6 9.6l1.2.8v10.2h-1.2z', 's')}<path className="lm-d" d="M9.4 20.6v-6.6a2.6 2.6 0 0 1 5.2 0v6.6z" /><path className="lm-d" d="M4.6 20.6v-5a1.4 1.4 0 0 1 2.8 0v5zM16.6 20.6v-5a1.4 1.4 0 0 1 2.8 0v5z" />{bar(2.8, 8, 18.4, 1.8, 's')}{poly('M8.4 8 12 3.6 15.6 8z', 'l')}{poly('M12 3.6 15.6 8h-3.2z', 's')}<circle className="lm-a" cx="12" cy="6.4" r=".8" /></> },
  // Australia: Parliament House beneath its flag mast.
  AUS: { id: 'parliament-house', art: () => <>{bar(1, 20.6, 22, 1.4, 'g')}{poly('M2 20.6 4.4 14.6h15.2l2.4 6z', 'l')}{poly('M12 14.6h7.6l2.4 6h-10z', 's')}{line('M7 16.2l-1 4.2M10 16.2l-.4 4.2M14 16.2l.4 4.2M17 16.2l1 4.2')}{poly('M8.6 14.6 12 9.4l3.4 5.2z', 'a')}{poly('M10.4 14.6 12 12.2l1.6 2.4z', 's')}{bar(11.8, 1, .5, 8.6, 'd')}{poly('M12.3 1l3.4 1.2-3.4 1.4z', 'r')}</> },
  // Netherlands: gabled canal houses beside the Westerkerk spire.
  NLD: { id: 'canal-houses', art: () => <>{bar(1.4, 20.6, 21.2, 1.4, 'b')}{bar(2.6, 11.4, 4.4, 9.2)}{poly('M2.6 11.4 4.8 8.6l2.2 2.8z', 'r')}{bar(7.4, 9.6, 4, 11)}{poly('M7.4 9.6l2-3.4 2 3.4z', 'r')}{bar(11.8, 12.4, 4.2, 8.2, 's')}{poly('M11.8 12.4l2.1-2.8 2.1 2.8z', 'r')}{bar(16.4, 7, 3.2, 13.6)}{poly('M19.6 7l.8.6v13h-.8z', 's')}{poly('M16.2 7 18 .8 19.8 7z', 'a')}<circle className="lm-f" cx="18" cy="10.6" r=".9" />{line('M3.8 13.6h2M3.8 16.4h2M8.4 12h2M8.4 15h2M12.8 14.8h2M12.8 17.6h2')}</> },
};

/** Symbols for every landmark; render once inside the map's <defs>. */
export function LandmarkSymbols() {
  return (
    <>
      {Object.values(LANDMARK_ART).map(({ id, art }) => (
        <symbol key={id} id={`lm-${id}`} viewBox="0 0 24 24" overflow="visible">
          <g className="lm-art">{art()}</g>
        </symbol>
      ))}
    </>
  );
}
export const landmarkSymbolId = (iso3: string): string | null => (LANDMARK_ART[iso3] ? `lm-${LANDMARK_ART[iso3].id}` : null);
