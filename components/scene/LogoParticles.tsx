"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { glslCommon, shaderMat, type Quality } from "@/lib/shared";
import { LOGOS, sampleLogo } from "@/lib/logos";
import { camPath, logoT, PATH_LEN } from "@/lib/path";

const vert = /* glsl */ `
${glslCommon}
attribute vec3 aStart; attribute vec3 aTarget; attribute vec3 aCenter; attribute vec4 aRand; attribute vec3 aTint; attribute float aS;
uniform float uCamS; uniform float uPixel;
varying vec3 vColor; varying float vAlpha;
void main(){
  float a = aS - uCamS;
  float form = (1. - smoothstep(17., 30., a));
  float t = clamp((form - aRand.x * .5) / .5, 0., 1.);
  float e = easeIO(t);
  vec3 p = mix(aStart, aTarget, e);
  p += (aRand.zwx - .5) * (1. - e) * e * 12.;
  p += vec3(sin(uTime * 1.7 + aRand.z * 30.), cos(uTime * 1.3 + aRand.w * 30.), sin(uTime * 1.1 + aRand.x * 30.)) * .035 * e;
  float disp = (1. - smoothstep(-5., 3., a));
  vec3 dir = normalize(aTarget - aCenter + (aRand.xyz - .5) * 3.);
  p += dir * disp * disp * (9. + aRand.y * 34.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((1.0 + aRand.w * 0.9) * uPixel * (24. / -mv.z), 1.3, 8. * uPixel);
  vec3 base = mix(vec3(.4, .95, 1.), vec3(1.), aRand.z * .6);
  vColor = mix(base, aTint, step(.78, aRand.y)) ;
  vAlpha = (1. - smoothstep(30., 38., a)) * (.2 + .8 * e) * (1. - disp);
}`;
const frag = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5);
  gl_FragColor = vec4(vColor * 0.9, vAlpha * 0.6 * (1. - smoothstep(0., .5, d)));
  #include <colorspace_fragment>
}`;


export default function LogoParticles({ q }: { q: Quality }) {
  const { geo, mat } = useMemo(() => {
    const per = q.logo;
    const SCALE = Math.min(4.4, 7.2 * (window.innerWidth / window.innerHeight));
    const n = per * LOGOS.length;
    const pos = new Float32Array(n * 3);
    const start = new Float32Array(n * 3);
    const target = new Float32Array(n * 3);
    const center = new Float32Array(n * 3);
    const rand = new Float32Array(n * 4);
    const tint = new Float32Array(n * 3);
    const aS = new Float32Array(n);
    const up = new THREE.Vector3(0, 1, 0);
    LOGOS.forEach((logo, li) => {
      const t = logoT(li);
      const c = camPath.getPointAt(t);
      const T = camPath.getTangentAt(t).normalize();
      const R = new THREE.Vector3().crossVectors(T, up).normalize();
      const U = new THREE.Vector3().crossVectors(R, T).normalize();
      const pts = sampleLogo(logo, per);
      for (let k = 0; k < per; k++) {
        const i = li * per + k;
        const x = pts[k * 2] * SCALE;
        const y = pts[k * 2 + 1] * SCALE;
        const z = (Math.random() - 0.5) * 0.5;
        target[i * 3] = c.x + R.x * x + U.x * y + T.x * z;
        target[i * 3 + 1] = c.y + R.y * x + U.y * y + T.y * z;
        target[i * 3 + 2] = c.z + R.z * x + U.z * y + T.z * z;
        center.set([c.x, c.y, c.z], i * 3);
        const r = 6 + Math.random() * 16;
        const th = Math.random() * Math.PI * 2;
        start[i * 3] = c.x + Math.cos(th) * r;
        start[i * 3 + 1] = c.y + Math.sin(th) * r * 0.6;
        start[i * 3 + 2] = c.z - 10 - Math.random() * 30;
        for (let j = 0; j < 4; j++) rand[i * 4 + j] = Math.random();
        tint.set(logo.tint, i * 3);
        aS[i] = t * PATH_LEN;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
    g.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
    g.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    const m = shaderMat(vert, frag, { uPixel: { value: Math.min(window.devicePixelRatio, q.maxDpr) } }, {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo: g, mat: m };
  }, [q.logo, q.maxDpr]);

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
