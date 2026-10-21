"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { glslCommon, shaderMat, type Quality } from "@/lib/shared";
import { HALL_END, HALL_START } from "@/lib/path";

const pipeVert = /* glsl */ `
${glslCommon}
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  mat4 m = modelViewMatrix;
  #ifdef USE_INSTANCING
    m = modelViewMatrix * instanceMatrix;
  #endif
  vec4 mv = m * vec4(position, 1.);
  vN = normalize(mat3(m) * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const pipeFrag = /* glsl */ `
${glslCommon}
uniform vec3 uColor; uniform float uSpeed; uniform float uLen;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.);
  float y = vUv.y * uLen;
  float flow = fract(y * .35 - uTime * uSpeed);
  float pulse = smoothstep(0., .1, flow) * (1. - smoothstep(.1, .55, flow));
  vec2 cell = floor(vec2(vUv.x * 14., y * 3. - uTime * uSpeed * 3.));
  float bub = step(.93, hash21(cell)) * 1.2;
  vec3 col = uColor * (.28 + .9 * pulse + bub) + uColor * f * 1.4;
  col = mix(col, uFogColor, fogF(length(vV)));
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

const sparkVert = /* glsl */ `
${glslCommon}
attribute vec4 aA; attribute vec4 aB;
uniform float uPixel; uniform float uL; uniform float uZ0;
varying vec3 vColor; varying float vAlpha;
void main(){
  // aA: x,y centre, phase, speed ; aB: radius, size, hueMix, angleSeed
  float zz = mod(aA.z * uL + uTime * aA.w, uL);
  float z = uZ0 - zz;
  float ang = z * 1.4 + aB.w * 6.283 + uTime * .5;
  vec3 p = vec3(aA.x + cos(ang) * aB.x, aA.y + sin(ang) * aB.x, z);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aB.y * uPixel * (26. / -mv.z), 1., 7. * uPixel);
  vec3 cold = vec3(.2, .85, 1.);
  vec3 warm = vec3(1., .5, .18);
  vColor = mix(cold, warm, aB.z);
  vAlpha = 1. - fogF(-mv.z);
}`;
const sparkFrag = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5);
  gl_FragColor = vec4(vColor * 1.8, vAlpha * (1. - smoothstep(0., .5, d)));
  #include <colorspace_fragment>
}`;

const L = HALL_START - HALL_END;
const zc = (HALL_START + HALL_END) / 2;
const COLD = new THREE.Color(0.1, 0.75, 1);
const WARM = new THREE.Color(1, 0.45, 0.14);

function pipeMat(color: THREE.Color, speed: number, len: number) {
  return shaderMat(pipeVert, pipeFrag, {
    uColor: { value: color },
    uSpeed: { value: speed },
    uLen: { value: len },
  });
}

export default function Coolant({ q }: { q: Quality }) {
  const drops = useRef<THREE.InstancedMesh>(null);
  const elbows = useRef<THREE.InstancedMesh>(null);
  const rungs = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(
    () => ({
      cold: pipeMat(COLD, 0.9, L),
      warm: pipeMat(WARM, -0.9, L),
      dropCold: pipeMat(COLD, 1.1, 4.3),
      dropWarm: pipeMat(WARM, -1.1, 4.3),
      cable: pipeMat(new THREE.Color(0.2, 0.9, 1), 2.4, L),
    }),
    [],
  );

  const sparks = useMemo(() => {
    const n = q.flow;
    const A = new Float32Array(n * 4);
    const B = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const kind = i % 3; // 0 cold, 1 warm, 2 cable
      const x = kind === 0 ? -4.65 : kind === 1 ? 4.65 : (Math.random() - 0.5) * 1.1;
      const y = kind === 2 ? 7.5 : 4.3;
      A.set([x, y, Math.random(), kind === 0 ? 9 : kind === 1 ? -9 : 26 + Math.random() * 12], i * 4);
      B.set([kind === 2 ? Math.random() * 0.35 : 0.2 + Math.random() * 0.12, 1.2 + Math.random() * 1.6, kind === 1 ? 1 : 0, Math.random()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aA", new THREE.BufferAttribute(A, 4));
    g.setAttribute("aB", new THREE.BufferAttribute(B, 4));
    const m = shaderMat(
      sparkVert,
      sparkFrag,
      { uPixel: { value: Math.min(window.devicePixelRatio, q.maxDpr) }, uL: { value: L }, uZ0: { value: HALL_START } },
      { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending },
    );
    return { g, m };
  }, [q.flow, q.maxDpr]);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    let di = 0;
    const nDrops = Math.floor(L / 3.8);
    for (let i = 0; i < nDrops; i++) {
      const z = HALL_START - 1 - i * 3.8;
      for (const sx of [-1, 1]) {
        o.position.set(sx * 3.78, 2.15, z + (sx < 0 ? 0 : 0.2));
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        drops.current!.setMatrixAt(di, o.matrix);
        o.position.set(sx * 3.78, 4.3, z + (sx < 0 ? 0 : 0.2));
        o.scale.setScalar(0.13);
        o.updateMatrix();
        elbows.current!.setMatrixAt(di, o.matrix);
        di++;
      }
    }
    drops.current!.count = di;
    elbows.current!.count = di;
    drops.current!.instanceMatrix.needsUpdate = true;
    elbows.current!.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < Math.floor(L / 1.2); i++) {
      o.position.set(0, 7.4, HALL_START - i * 1.2);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      rungs.current!.setMatrixAt(i, o.matrix);
    }
    rungs.current!.instanceMatrix.needsUpdate = true;
  }, []);

  const nDrops = Math.floor(L / 3.8) * 2;
  const cyl = (r: number, len: number) => <cylinderGeometry args={[r, r, len, 14, 1, true]} />;
  return (
    <group>
      <mesh position={[-4.65, 4.3, zc]} rotation={[Math.PI / 2, 0, 0]} material={mats.cold}>
        {cyl(0.16, L)}
      </mesh>
      <mesh position={[4.65, 4.3, zc]} rotation={[Math.PI / 2, 0, 0]} material={mats.warm}>
        {cyl(0.16, L)}
      </mesh>
      <mesh position={[0, 7.45, zc]} rotation={[Math.PI / 2, 0, 0]} material={mats.cable}>
        {cyl(0.05, L)}
      </mesh>
      <mesh position={[-0.7, 7.3, zc]}>
        <boxGeometry args={[0.06, 0.06, L]} />
        <meshStandardMaterial color="#2a3a4b" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.7, 7.3, zc]}>
        <boxGeometry args={[0.06, 0.06, L]} />
        <meshStandardMaterial color="#2a3a4b" metalness={0.9} roughness={0.3} />
      </mesh>
      <instancedMesh ref={rungs} args={[undefined, undefined, Math.floor(L / 1.2)]} frustumCulled={false}>
        <boxGeometry args={[1.4, 0.04, 0.05]} />
        <meshStandardMaterial color="#1b2733" metalness={0.8} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={drops} args={[undefined, undefined, nDrops]} material={mats.dropCold} frustumCulled={false}>
        {cyl(0.07, 4.3)}
      </instancedMesh>
      <instancedMesh ref={elbows} args={[undefined, undefined, nDrops]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color={new THREE.Color(0.2, 1.2, 1.6)} toneMapped={false} />
      </instancedMesh>
      <points geometry={sparks.g} material={sparks.m} frustumCulled={false} />
    </group>
  );
}
