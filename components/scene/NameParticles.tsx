"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { glslCommon, shaderMat, type Quality } from "@/lib/shared";
import { scrollState } from "@/lib/scroll";

const W = 16;

function sampleText(text: string, count: number) {
  const cv = document.createElement("canvas");
  cv.width = 1400;
  cv.height = 300;
  const c = cv.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  let size = 220;
  c.font = `900 ${size}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
  (c as unknown as { letterSpacing: string }).letterSpacing = "10px";
  const m = c.measureText(text).width;
  size = Math.floor((size * 1250) / m);
  c.font = `900 ${size}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
  c.fillText(text, 700, 152);
  const d = c.getImageData(0, 0, 1400, 300).data;
  const px: number[] = [];
  for (let y = 0; y < 300; y += 2) for (let x = 0; x < 1400; x += 2) if (d[(y * 1400 + x) * 4 + 3] > 128) px.push(x, y);
  const n = px.length / 2;
  const k = W / 1400;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * n);
    out[i * 3] = (px[j * 2] + Math.random() * 2 - 700) * k;
    out[i * 3 + 1] = -(px[j * 2 + 1] + Math.random() * 2 - 150) * k;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  }
  return out;
}

const vert = /* glsl */ `
${glslCommon}
attribute vec3 aStart; attribute vec3 aTarget; attribute vec4 aRand;
uniform float uForm; uniform float uDisperse; uniform float uPixel;
varying vec3 vColor; varying float vAlpha;
void main(){
  float t = clamp((uForm - aRand.x * 0.45) / 0.55, 0., 1.);
  float e = easeIO(t);
  vec3 p = mix(aStart, aTarget, e);
  float ang = (1. - e) * (aRand.y - .5) * 3.2;
  float cs = cos(ang), sn = sin(ang);
  p.xy = mat2(cs, -sn, sn, cs) * p.xy;
  p += vec3(sin(uTime * 1.3 + aRand.z * 20.), cos(uTime * 1.1 + aRand.w * 20.), sin(uTime + aRand.x * 10.)) * .045 * e;
  vec3 dir = normalize(vec3(aTarget.xy * .7 + (aRand.zw - .5) * 6., (aRand.x - .5) * 6.));
  p += dir * uDisperse * uDisperse * (12. + aRand.y * 42.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((1.1 + aRand.w * 1.6) * uPixel * (32. / -mv.z), 1., 10. * uPixel);
  vColor = vec3(mix(.42, .05, e) + aRand.z * .12);
  vAlpha = (.25 + .7 * e) * (1. - uDisperse);
}`;
const frag = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = 1. - smoothstep(.0, .5, d);
  gl_FragColor = vec4(vColor, vAlpha * a);
  #include <colorspace_fragment>
}`;

const OUTRO_POS: [number, number, number] = [0, 58, 16];

export default function NameParticles({ q, outro = false }: { q: Quality; outro?: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const { geo, mat } = useMemo(() => {
    const n = q.name;
    const target = sampleText("VINOD-AI", n);
    const start = new Float32Array(n * 3);
    const rand = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const r = outro ? 0.5 + Math.random() * 5 : 28 + Math.random() * 45;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      start[i * 3] = r * Math.sin(ph) * Math.cos(th);
      start[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * (outro ? 1 : 0.7);
      // outro: burst out of the tower top, which sits 16 units behind the name
      start[i * 3 + 2] = r * Math.cos(ph) - (outro ? 16 : 20);
      for (let k = 0; k < 4; k++) rand[i * 4 + k] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    const m = shaderMat(
      vert,
      frag,
      { uForm: { value: 0 }, uDisperse: { value: 0 }, uPixel: { value: 1 } },
      { transparent: true, depthWrite: false, blending: THREE.NormalBlending },
    );
    return { geo: g, mat: m };
  }, [q.name, outro]);

  const t0 = useRef<number | null>(null);
  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const el = state.clock.elapsedTime;
    if (t0.current === null) t0.current = el;
    const auto = Math.min(1, (el - t0.current) / 3.2);
    const ss = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const p = scrollState.s;
    mat.uniforms.uPixel.value = state.gl.getPixelRatio();
    if (outro) {
      mat.uniforms.uForm.value = ss(0.9, 0.985, p);
      pts.visible = p > 0.88;
    } else {
      mat.uniforms.uForm.value = Math.max(auto * auto * 0.4, ss(0, 0.075, p));
      mat.uniforms.uDisperse.value = ss(0.105, 0.17, p);
      pts.visible = p < 0.2;
    }
    if (pts.visible) {
      const vw = viewport.getCurrentViewport(state.camera, pts.position).width;
      pts.scale.setScalar(Math.min(1, (vw * 0.82) / W));
    }
  });

  return <points ref={ref} geometry={geo} material={mat} position={outro ? OUTRO_POS : [0, 15, 44]} frustumCulled={false} />;
}
