"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { glslCommon, shaderMat } from "@/lib/shared";
import { HALL_END, HALL_START } from "@/lib/path";

type Beam = [THREE.Vector3, THREE.Vector3, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function buildBeams() {
  const beams: Beam[] = [];
  const nodes: THREE.Vector3[] = [];
  // octagonal rings the camera flies through
  const RS = 7, R = 3.5, CY = 3.6;
  const ringCount = Math.floor((HALL_START - HALL_END) / RS);
  const verts = (z: number) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      return V(Math.cos(a) * R, CY + Math.sin(a) * R, z);
    });
  let prev: THREE.Vector3[] | null = null;
  for (let k = 0; k < ringCount; k++) {
    const v = verts(HALL_START - k * RS);
    for (let i = 0; i < 8; i++) {
      beams.push([v[i], v[(i + 1) % 8], 0.11]);
      nodes.push(v[i]);
    }
    if (prev) {
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) beams.push([prev[i], v[i], 0.1]);
        beams.push([prev[i], v[(i + (k % 2 ? 1 : 7)) % 8], 0.055]);
      }
    }
    prev = v;
  }
  // eiffel style A-frames
  for (let j = 0; j < 5; j++) {
    const z = -34 - j * 30;
    for (const sx of [-1, 1]) {
      const leg = (off: number, s: number) => V(sx * (2.2 + 7.4 * Math.pow(1 - s, 1.8)), 13.5 * s, z + off);
      const N = 10;
      for (const off of [-0.8, 0.8]) {
        for (let i = 0; i < N; i++) beams.push([leg(off, i / N), leg(off, (i + 1) / N), 0.26 * (1 - (i / N) * 0.6)]);
      }
      for (let i = 0; i < N; i++) {
        beams.push([leg(-0.8, i / N), leg(0.8, (i + 1) / N), 0.07]);
        beams.push([leg(0.8, i / N), leg(-0.8, (i + 1) / N), 0.07]);
      }
    }
    for (const s of [0.66, 0.85, 0.99]) {
      for (const off of [-0.8, 0.8]) {
        const x = 2.2 + 7.4 * Math.pow(1 - s, 1.8);
        beams.push([V(-x, 13.5 * s, z + off), V(x, 13.5 * s, z + off), 0.14]);
      }
    }
  }
  return { beams, nodes };
}

const RACK_PITCH = 0.95;
const rackCount = Math.floor((HALL_START - HALL_END) / RACK_PITCH);

const rackVert = /* glsl */ `
${glslCommon}
attribute float aSeed;
varying vec2 vUv; varying float vSeed; varying float vWz; varying float vDist;
void main(){
  vUv = uv; vSeed = aSeed;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.);
  vWz = wp.z;
  vec4 mv = viewMatrix * wp;
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const rackFrag = /* glsl */ `
${glslCommon}
varying vec2 vUv; varying float vSeed; varying float vWz; varying float vDist;
void main(){
  float rows = 42.;
  float r = floor(vUv.y * rows);
  float fy = fract(vUv.y * rows);
  vec3 col = vec3(.012, .02, .03);
  float unit = step(.12, fy) * step(fy, .88);
  col += vec3(.02, .03, .045) * unit;
  // vents
  float vent = step(.5, fract(vUv.x * 34.)) * step(.3, vUv.x) * step(vUv.x, .78) * unit;
  col += vec3(.01, .02, .03) * vent;
  // blinking leds
  float led = 0.;
  vec3 lc = vec3(0.);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float lx = .08 + fi * .06;
    float on = step(.45, hash21(vec2(r + vSeed * 91., fi + floor(uTime * (.6 + hash11(r * 3. + vSeed) * 3.)))));
    float dot_ = (1. - smoothstep(.008, .022, length(vec2((vUv.x - lx) * 2.2, (fy - .5) * .55))));
    vec3 c = hash21(vec2(r, vSeed + fi)) > .93 ? vec3(1., .45, .12) : vec3(.1, .85, 1.);
    lc += c * dot_ * on;
  }
  col += lc * 2.2;
  // ai sweep wave travelling through the hall
  float wave = smoothstep(.0, 1., sin(vWz * .09 - uTime * 1.4) * .5 + .5);
  wave = pow(wave, 6.);
  col += vec3(.05, .35, .6) * wave * unit * (.5 + .5 * step(.5, fract(vUv.x * 12.)));
  col += vec3(.02, .1, .18) * smoothstep(.45, .5, fy) * (1. - smoothstep(.5, .55, fy)) * 0.;
  col = mix(col, uFogColor, fogF(vDist));
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

const plateVert = /* glsl */ `
${glslCommon}
attribute vec3 aColor;
varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vL;
void main(){
  vC = aColor; vL = position;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.);
  vN = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const plateFrag = /* glsl */ `
${glslCommon}
varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vL;
void main(){
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.);
  float scan = smoothstep(.45, .5, abs(fract(vL.y * 5. - uTime * .8) - .5));
  vec3 col = vC * (.25 + f * 1.8 + scan * .5);
  col = mix(col, uFogColor, fogF(length(vV)));
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

const floorVert = /* glsl */ `
varying vec3 vW; varying float vDist;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const floorFrag = /* glsl */ `
${glslCommon}
varying vec3 vW; varying float vDist;
float grid(vec2 p, float w){ vec2 g = abs(fract(p - .5) - .5) / fwidth(p); return 1. - min(min(g.x, g.y) / w, 1.); }
void main(){
  float g = grid(vW.xz * .5, 1.2) * .5 + grid(vW.xz * 2., 1.) * .15;
  float lane = (1. - smoothstep(.0, .12, abs(abs(vW.x) - 3.9))) * (.6 + .4 * sin(vW.z * .8 - uTime * 3.));
  float pulse = (1. - smoothstep(0., .08, abs(fract(vW.z * .02 - uTime * .07) - .5) - .45)) ;
  vec3 col = vec3(.008, .014, .022) + vec3(.05, .35, .6) * g * .32 + vec3(.1, .8, 1.) * lane * .9 + vec3(.05, .3, .5) * pulse * g;
  col = mix(col, uFogColor, fogF(vDist));
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

export default function Hall() {
  const steel = useRef<THREE.InstancedMesh>(null);
  const nodeMesh = useRef<THREE.InstancedMesh>(null);
  const racks = useRef<THREE.InstancedMesh>(null);
  const panels = useRef<THREE.InstancedMesh>(null);
  const plates = useRef<THREE.InstancedMesh>(null);
  const { beams, nodes } = useMemo(buildBeams, []);

  const panelGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.82, 3.2);
    const seed = new Float32Array(rackCount * 2);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    return g;
  }, []);
  const panelMat = useMemo(() => shaderMat(rackVert, rackFrag), []);
  const plateGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.7, 0.3, 0.7);
    const n = Math.ceil(rackCount / 3) * 2;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) (i % 2 ? [1, 0.45, 0.15] : [0.1, 0.75, 1]).forEach((v, k) => (col[i * 3 + k] = v));
    g.setAttribute("aColor", new THREE.InstancedBufferAttribute(col, 3));
    return g;
  }, []);
  const plateMat = useMemo(() => shaderMat(plateVert, plateFrag), []);
  const floorMat = useMemo(() => shaderMat(floorVert, floorFrag), []);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const Y = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    beams.forEach(([a, b, t], i) => {
      dir.subVectors(b, a);
      const len = dir.length();
      o.position.addVectors(a, b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(Y, dir.normalize());
      o.scale.set(t, len, t);
      o.updateMatrix();
      steel.current!.setMatrixAt(i, o.matrix);
    });
    steel.current!.instanceMatrix.needsUpdate = true;

    nodes.forEach((p, i) => {
      o.position.copy(p);
      o.quaternion.identity();
      o.scale.setScalar(0.2);
      o.updateMatrix();
      nodeMesh.current!.setMatrixAt(i, o.matrix);
      nodeMesh.current!.setColorAt(i, new THREE.Color(i % 5 === 0 ? "#ff8a3d" : "#22d3ee").multiplyScalar(2.2));
    });
    nodeMesh.current!.instanceMatrix.needsUpdate = true;
    nodeMesh.current!.instanceColor!.needsUpdate = true;

    let pi = 0;
    for (let i = 0; i < rackCount; i++) {
      const z = HALL_START - 0.5 - i * RACK_PITCH;
      for (const sx of [-1, 1]) {
        const idx = i * 2 + (sx < 0 ? 0 : 1);
        o.position.set(sx * 4.65, 1.7, z);
        o.quaternion.identity();
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        racks.current!.setMatrixAt(idx, o.matrix);
        o.position.set(sx * 3.99, 1.7, z);
        o.rotation.set(0, (sx * Math.PI) / -2, 0);
        o.updateMatrix();
        panels.current!.setMatrixAt(idx, o.matrix);
        o.rotation.set(0, 0, 0);
        if (i % 3 === 0) {
          o.position.set(sx * 4.65, 3.55, z);
          o.updateMatrix();
          plates.current!.setMatrixAt(pi * 2 + (sx < 0 ? 0 : 1), o.matrix);
        }
      }
      if (i % 3 === 0) pi++;
    }
    for (const m of [racks, panels, plates]) m.current!.instanceMatrix.needsUpdate = true;
    plates.current!.count = pi * 2;
  }, [beams, nodes]);

  const zc = (HALL_START + HALL_END) / 2;
  const zl = HALL_START - HALL_END;
  return (
    <group>
      <instancedMesh ref={steel} args={[undefined, undefined, beams.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5a7390" metalness={0.6} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={nodeMesh} args={[undefined, undefined, nodes.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={racks} args={[undefined, undefined, rackCount * 2]} frustumCulled={false}>
        <boxGeometry args={[1.3, 3.4, 0.88]} />
        <meshStandardMaterial color="#0b1219" metalness={0.7} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={panels} args={[panelGeo, panelMat, rackCount * 2]} frustumCulled={false} />
      <instancedMesh ref={plates} args={[plateGeo, plateMat, Math.ceil(rackCount / 3) * 2]} frustumCulled={false} />
      <mesh position={[0, 0, zc + 10]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
        <planeGeometry args={[40, zl + 80]} />
      </mesh>
    </group>
  );
}
