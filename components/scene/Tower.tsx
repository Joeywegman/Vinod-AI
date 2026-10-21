"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Procedural wrought-iron tower, loosely after the Eiffel Tower (1 unit is about 5 m). */
export const H = 65;
const Y1 = 11.4; // first platform
const Y2 = 23; // second platform
const YT = 55; // top platform

/** half-width of the tower at height y, measured to the outer corner */
export const halfWidth = (y: number) => 1.25 + 11.3 * Math.pow(Math.max(0, 1 - y / H), 2.3);
/** cross-section of one leg below the second platform */
const legWidth = (y: number) => 3.4 - (1.8 * Math.min(y, Y2)) / Y2;

type Beam = [THREE.Vector3, THREE.Vector3, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** X-braced panel between four corners (a,b bottom; c,d top), with a strut along the bottom. */
function panel(out: Beam[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, t: number, split = 1) {
  for (let k = 0; k < split; k++) {
    const f0 = k / split, f1 = (k + 1) / split;
    const a0 = a.clone().lerp(b, f0), a1 = a.clone().lerp(b, f1);
    const c0 = c.clone().lerp(d, f0), c1 = c.clone().lerp(d, f1);
    out.push([a0, c1, t], [a1, c0, t]);
    if (k > 0) out.push([a0, c0, t * 0.9]);
  }
  out.push([a, b, t * 1.4]);
}

function buildTower() {
  const beams: Beam[] = [];
  const signs: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  // four legs, each a square box truss following the tower's curve
  const NL = 26;
  for (const [sx, sz] of signs) {
    const ring = (y: number) => {
      const w = halfWidth(y), l = legWidth(y);
      return [V(sx * w, y, sz * w), V(sx * (w - l), y, sz * w), V(sx * (w - l), y, sz * (w - l)), V(sx * w, y, sz * (w - l))];
    };
    for (let i = 0; i < NL; i++) {
      const y0 = (i / NL) * Y2, y1 = ((i + 1) / NL) * Y2;
      const r0 = ring(y0), r1 = ring(y1);
      const chord = 0.26 - 0.1 * (y0 / Y2);
      for (let k = 0; k < 4; k++) {
        beams.push([r0[k], r1[k], chord]);
        panel(beams, r0[k], r0[(k + 1) % 4], r1[k], r1[(k + 1) % 4], 0.055, 2);
      }
    }
  }

  // single shaft above the second platform
  const NS = 34;
  const sq = (y: number, inset = 0) => {
    const w = halfWidth(y) - inset;
    return [V(w, y, w), V(-w, y, w), V(-w, y, -w), V(w, y, -w)];
  };
  for (let i = 0; i < NS; i++) {
    const y0 = Y2 + ((YT - Y2) * i) / NS, y1 = Y2 + ((YT - Y2) * (i + 1)) / NS;
    const r0 = sq(y0), r1 = sq(y1);
    const chord = 0.24 - 0.12 * ((y0 - Y2) / (YT - Y2));
    for (let k = 0; k < 4; k++) {
      beams.push([r0[k], r1[k], chord]);
      // inner chord pair gives the corners depth
      const i0 = sq(y0, 0.5)[k], i1 = sq(y1, 0.5)[k];
      beams.push([i0, i1, chord * 0.6], [r0[k], i1, 0.04]);
      panel(beams, r0[k], r0[(k + 1) % 4], r1[k], r1[(k + 1) % 4], 0.045, y0 < 40 ? 3 : 2);
    }
  }

  // platforms: a latticed girder band around the tower plus a deck frame
  const platform = (y: number, W: number, band: number, deck: number) => {
    const lo = y - band / 2, hi = y + band / 2;
    const c = (h: number) => [V(W, h, W), V(-W, h, W), V(-W, h, -W), V(W, h, -W)];
    const bl = c(lo), bh = c(hi);
    const n = Math.round((W * 2) / (band * 0.8));
    for (let k = 0; k < 4; k++) {
      beams.push([bl[k], bl[(k + 1) % 4], 0.2], [bh[k], bh[(k + 1) % 4], 0.22]);
      for (let j = 0; j < n; j++) {
        const f0 = j / n, f1 = (j + 1) / n;
        const p0 = bl[k].clone().lerp(bl[(k + 1) % 4], f0), p1 = bl[k].clone().lerp(bl[(k + 1) % 4], f1);
        const q0 = bh[k].clone().lerp(bh[(k + 1) % 4], f0), q1 = bh[k].clone().lerp(bh[(k + 1) % 4], f1);
        beams.push([p0, q1, 0.05], [p1, q0, 0.05], [p0, q0, 0.07]);
      }
      // railing posts and handrail
      const rail = c(hi + 0.8);
      beams.push([rail[k], rail[(k + 1) % 4], 0.05]);
      for (let j = 0; j <= n * 2; j++) {
        const f = j / (n * 2);
        beams.push([bh[k].clone().lerp(bh[(k + 1) % 4], f), rail[k].clone().lerp(rail[(k + 1) % 4], f), 0.03]);
      }
    }
    return { y: hi, W, deck };
  };
  const decks = [
    platform(Y1, halfWidth(Y1) + 0.5, 1.7, 2.6),
    platform(Y2, halfWidth(Y2) + 0.4, 1.2, 1.7),
    platform(YT, halfWidth(YT) + 0.5, 0.8, 0.9),
  ];

  // four decorative arches between the legs
  const N = 44;
  for (let face = 0; face < 4; face++) {
    const a = halfWidth(3) - legWidth(3) + 0.2;
    const top = Y1 - 1.1;
    const pt = (th: number, inset: number) => {
      const x = Math.cos(th) * (a - inset);
      const y = 3 + Math.sin(th) * (top - 3 - inset);
      const z = halfWidth(y) - 0.35;
      return face === 0 ? V(x, y, z) : face === 1 ? V(x, y, -z) : face === 2 ? V(z, y, x) : V(-z, y, x);
    };
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI, t1 = ((i + 1) / N) * Math.PI;
      const o0 = pt(t0, 0), o1 = pt(t1, 0), n0 = pt(t0, 0.9), n1 = pt(t1, 0.9);
      beams.push([o0, o1, 0.2], [n0, n1, 0.14], [o0, n1, 0.04], [n0, o1, 0.04]);
      if (i % 2 === 0) beams.push([o0, n0, 0.05]);
    }
  }

  // antenna and top cabin posts
  beams.push([V(0, YT, 0), V(0, H + 4, 0), 0.22]);
  for (let k = 0; k < 4; k++) {
    const r = sq(YT)[k];
    beams.push([r, V(0, YT + 4, 0), 0.08]);
  }
  return { beams, decks };
}

export default function Tower({ shadows }: { shadows: boolean }) {
  const steel = useRef<THREE.InstancedMesh>(null);
  const deckRef = useRef<THREE.InstancedMesh>(null);
  const { beams, decks } = useMemo(buildTower, []);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const Y = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    beams.forEach(([a, b, t], i) => {
      dir.subVectors(b, a);
      const len = dir.length();
      o.position.addVectors(a, b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(Y, dir.normalize());
      o.scale.set(t, len + t * 0.5, t);
      o.updateMatrix();
      steel.current!.setMatrixAt(i, o.matrix);
    });
    steel.current!.instanceMatrix.needsUpdate = true;
    steel.current!.computeBoundingSphere();

    // each deck is a square frame made of four slabs
    let i = 0;
    o.quaternion.identity();
    for (const { y, W, deck } of decks) {
      for (let k = 0; k < 4; k++) {
        const along = k < 2;
        const s = k % 2 ? -1 : 1;
        o.position.set(along ? 0 : s * (W - deck / 2), y, along ? s * (W - deck / 2) : 0);
        o.scale.set(along ? W * 2 : deck, 0.18, along ? deck : W * 2);
        o.updateMatrix();
        deckRef.current!.setMatrixAt(i++, o.matrix);
      }
    }
    deckRef.current!.instanceMatrix.needsUpdate = true;
  }, [beams, decks]);

  return (
    <group>
      <instancedMesh ref={steel} args={[undefined, undefined, beams.length]} castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1d1d1d" roughness={0.72} metalness={0.25} />
      </instancedMesh>
      <instancedMesh ref={deckRef} args={[undefined, undefined, decks.length * 4]} castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} metalness={0.15} />
      </instancedMesh>
      <mesh position={[0, 56.4, 0]} castShadow={shadows}>
        <boxGeometry args={[2.2, 2.4, 2.2]} />
        <meshStandardMaterial color="#232323" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}>
        <circleGeometry args={[220, 64]} />
        <meshStandardMaterial color="#e4e4e1" roughness={1} />
      </mesh>
    </group>
  );
}
