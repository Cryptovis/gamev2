/** Rule of Nations is a proper name: it is never translated and is marked translate="no" for browsers. */
export const BRAND_NAME = 'Rule of Nations';
export const BRAND_SHORT = 'RON';
export const STUDIO_NAME = 'RON Interactive';

export function BrandMark({ className = '' }: { className?: string }) {
  return <span className={`brand-mark ${className}`.trim()} translate="no">
    <span className="brand-mark-emblem" aria-hidden="true">{BRAND_SHORT}</span>
    <strong>{BRAND_NAME}</strong>
  </span>;
}
