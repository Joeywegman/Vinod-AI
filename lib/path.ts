import * as THREE from "three";

const pts: [number, number, number][] = [
  [0, 1.7, 18], [0, 1.7, 10], [0, 1.7, 1], [0, 1.8, -10], [0.5, 1.9, -26],
  [-0.6, 2.4, -42], [0.3, 3.2, -58], [0, 4.2, -72], [0, 3.0, -88],
  [0.8, 1.9, -104], [-0.6, 1.9, -120], [0, 2.4, -138], [0, 2.8, -152], [0, 3.0, -166],
];

export const camPath = new THREE.CatmullRomCurve3(
  pts.map((p) => new THREE.Vector3(...p)),
  false,
  "centripetal",
);
camPath.arcLengthDivisions = 600;
export const PATH_LEN = camPath.getLength();

/** scroll progress at which the camera starts moving */
export const T_START = 0.08;

/** logos sit at these path fractions; the camera slows down shortly before each one */
export const LOGO_COUNT = 13;
export const logoT = (i: number) => 0.26 + (i / (LOGO_COUNT - 1)) * 0.68;
export const dwellT = (i: number) => logoT(i) - 17 / PATH_LEN;

const N = 800;
const cum = new Float32Array(N + 1);
(() => {
  const ss = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let k = 0; k < N; k++) {
    const t = (k + 0.5) / N;
    let d = 1;
    for (let i = 0; i < LOGO_COUNT; i++) d = Math.min(d, Math.abs(t - dwellT(i)));
    const dt = 0.22 + 0.78 * ss(0.004, 0.03, d); // t advanced per unit of scroll
    cum[k + 1] = cum[k] + 1 / dt; // scroll needed for this slice
  }
})();
/** scroll fraction (0..1 of the moving range) -> path fraction, slow near logos */
function invCum(u: number) {
  const target = u * cum[N];
  let lo = 0, hi = N;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] < target) lo = m; else hi = m;
  }
  const f = (target - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  return (lo + f) / N;
}
export const scrollToT = (p: number) => invCum(Math.min(1, Math.max(0, (p - T_START) / (1 - T_START))));
/** inverse, for debugging: scroll p for a path fraction */
export function tToScroll(t: number) {
  const k = Math.min(N, Math.max(0, t * N));
  const lo = Math.floor(k);
  const c = cum[lo] + (cum[Math.min(N, lo + 1)] - cum[lo]) * (k - lo);
  return T_START + (1 - T_START) * (c / cum[N]);
}

export const HALL_START = -12;
export const HALL_END = -162;
export const CORE_POS = new THREE.Vector3(0, 3.2, -186);
