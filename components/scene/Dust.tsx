"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { glslCommon, shaderMat, type Quality } from "@/lib/shared";

const vert = /* glsl */ `
${glslCommon}
attribute vec4 aR;
uniform float uPixel;
varying float vA; varying vec3 vC;
void main(){
  vec3 p = position;
  p.x += sin(uTime * .2 + aR.x * 40.) * .6;
  p.y += cos(uTime * .17 + aR.y * 40.) * .5 + mod(uTime * aR.z * .3, 1.) * .0;
  p.z += sin(uTime * .15 + aR.w * 40.) * .8;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((.8 + aR.z * 1.6) * uPixel * (22. / -mv.z), 1., 5. * uPixel);
  vA = (1. - fogF(-mv.z)) * (.4 + .6 * sin(uTime * 2. + aR.w * 50.) * .5 + .3);
  vC = aR.x > .85 ? vec3(1., .55, .2) : vec3(.35, .85, 1.);
}`;
const frag = /* glsl */ `
varying float vA; varying vec3 vC;
void main(){
  float d = length(gl_PointCoord - .5);
  gl_FragColor = vec4(vC * 1.5, vA * (1. - smoothstep(0., .5, d)));
  #include <colorspace_fragment>
}`;

export default function Dust({ q }: { q: Quality }) {
  const { g, m } = useMemo(() => {
    const n = q.dust;
    const pos = new Float32Array(n * 3);
    const r = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * 16, Math.random() * 9, 22 - Math.random() * 200], i * 3);
      for (let k = 0; k < 4; k++) r[i * 4 + k] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aR", new THREE.BufferAttribute(r, 4));
    const mat = shaderMat(vert, frag, { uPixel: { value: Math.min(window.devicePixelRatio, q.maxDpr) } }, {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { g: geo, m: mat };
  }, [q.dust, q.maxDpr]);
  return <points geometry={g} material={m} frustumCulled={false} />;
}
