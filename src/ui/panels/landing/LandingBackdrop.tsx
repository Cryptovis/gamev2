/** Decorative layers behind the landing stage. Hidden from assistive technology; no text lives here. */
export const LANDING_COVER_ART='/assets/command/campaign-cover.webp';

export function LandingBackdrop() {
  return <div className="l94-backdrop" aria-hidden="true">
    <img className="l94-art" src={LANDING_COVER_ART} alt="" decoding="async" fetchPriority="high"/>
    <div className="l94-wash"/>
    <div className="l94-graticule"/>
    <div className="l94-vignette"/>
  </div>;
}
