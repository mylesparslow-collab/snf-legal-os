/**
 * Exact rational arithmetic on BigInt. Percentages are entered as decimal
 * strings ("62.5", "33.3333") and never touch floating point, so a chain of
 * products like 90% x 62.5% x 33% is exact, and "sums to 100" means exactly 100.
 */
export interface Q {
  n: bigint;
  d: bigint; // always > 0, reduced
}

const abs = (x: bigint) => (x < 0n ? -x : x);
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}

export function q(n: bigint, d: bigint = 1n): Q {
  if (d === 0n) throw new Error('division by zero');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** Parse a plain decimal string. Rejects exponents, commas and anything else. */
export function parse(s: string): Q {
  const m = /^(-)?(\d+)(?:\.(\d+))?$/.exec(s.trim());
  if (!m) throw new Error(`not a plain decimal: "${s}"`);
  const frac = m[3] ?? '';
  const n = BigInt(m[2] + frac) * (m[1] ? -1n : 1n);
  return q(n, 10n ** BigInt(frac.length));
}

export const ZERO = q(0n);
export const HUNDRED = q(100n);
export const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
export const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
export const cmp = (a: Q, b: Q) => {
  const x = a.n * b.d - b.n * a.d;
  return x < 0n ? -1 : x > 0n ? 1 : 0;
};
export const eq = (a: Q, b: Q) => cmp(a, b) === 0;
export const gte = (a: Q, b: Q) => cmp(a, b) >= 0;
export const sum = (xs: Q[]) => xs.reduce(add, ZERO);

/** Percent of percent: (a% of b%) as a percent. */
export const pctOf = (a: Q, b: Q) => div(mul(a, b), HUNDRED);

/** True when the value has a finite decimal expansion (denominator 2^x 5^y). */
export function terminates(a: Q): boolean {
  let d = a.d;
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  return d === 1n;
}

/**
 * Exact decimal string when it terminates within `max` places; otherwise the
 * value rounded half-up to `max` places with a trailing "…" so nobody mistakes
 * a rounded figure for an exact one.
 */
export function format(a: Q, max = 8): string {
  const neg = a.n < 0n;
  const n = abs(a.n);
  const scale = 10n ** BigInt(max);
  const scaled = n * scale;
  let units = scaled / a.d;
  const rem = scaled % a.d;
  const exact = rem === 0n;
  if (!exact && rem * 2n >= a.d) units += 1n;
  const int = (units / scale).toString();
  const frac = (units % scale).toString().padStart(max, '0').replace(/0+$/, '');
  const body = frac ? `${int}.${frac}` : int;
  return `${neg ? '-' : ''}${body}${exact ? '' : '…'}`;
}

export const toNumber = (a: Q) => Number(a.n) / Number(a.d);
