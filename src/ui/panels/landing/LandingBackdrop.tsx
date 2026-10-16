/** Decorative layers behind the landing stage. Hidden from assistive technology; no text lives here. */
export const LANDING_BACKDROP_URL='/assets/command/landing-backdrop.jpg';

/** The wallpaper is a CSS background (see .l94-art) so it scales to cover the screen at any size. */
export function LandingBackdrop() {
  return <div className="l94-backdrop" aria-hidden="true">
    <div className="l94-art"/>
    <div className="l94-wash"/>
    <div className="l94-graticule"/>
    <div className="l94-vignette"/>
  </div>;
}
