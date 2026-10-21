"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { glslCommon, shaderMat, type Quality } from "@/lib/shared";

const vert = /* glsl */ `
${glslCommon}
attribute vec4 aR;
uniform float uPixel;
varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * .15 + aR.x * 40.) * .8;
  p.y += mod(uTime * (.15 + aR.z * .3) + aR.y * 70., 70.) - 35.;
  p.z += cos(uTime * .12 + aR.w * 40.) * .8;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((.8 + aR.z * 1.2) * uPixel * (20. / -mv.z), 1., 4. * uPixel);
  vA = (1. - fogF(-mv.z)) * (.25 + .35 * aR.w);
}`;
const frag = /* glsl */ `
varying float vA;
void main(){
  float d = length(gl_PointCoord - .5);
  gl_FragColor = vec4(vec3(.1), vA * (1. - smoothstep(0., .5, d)));
  #include <colorspace_fragment>
}`;

/** Slowly rising specks of soot around the tower. */
export default function Dust({ q }: { q: Quality }) {
  const { g, m } = useMemo(() => {
    const n = q.dust;
    const pos = new Float32Array(n * 3);
    const r = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * 50, 35, (Math.random() - 0.5) * 50 + 8], i * 3);
      for (let k = 0; k < 4; k++) r[i * 4 + k] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aR", new THREE.BufferAttribute(r, 4));
    const mat = shaderMat(vert, frag, { uPixel: { value: Math.min(window.devicePixelRatio, q.maxDpr) } }, {
      transparent: true,
      depthWrite: false,
    });
    return { g: geo, m: mat };
  }, [q.dust, q.maxDpr]);
  return <points geometry={g} material={m} frustumCulled={false} />;
}
