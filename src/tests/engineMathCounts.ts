/**
 * Counts calls whose results are not guaranteed bit-identical across JavaScript engines.
 * IEEE-754 pins + - * / and sqrt exactly; V8, JavaScriptCore and SpiderMonkey may round the transcendental
 * functions and general powers differently in the last bit, which a simulation compounds into diverging saves.
 */
export const RISKY_MATH_FUNCTIONS = 'pow|exp|log|log2|log10|log1p|expm1|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|cbrt|hypot';

const MATH_CALL = new RegExp(`\\bMath\\.(?:${RISKY_MATH_FUNCTIONS})\\b`, 'g');
const POWER_OPERATOR = /\*\*/g;

/** Drops block comments (including JSDoc) and line comments; `://` inside a URL is not a comment. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

export function countRiskyMath(source: string): { math: number; power: number } {
  const code = stripComments(source);
  return { math: (code.match(MATH_CALL) ?? []).length, power: (code.match(POWER_OPERATOR) ?? []).length };
}
