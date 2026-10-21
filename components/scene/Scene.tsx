"use client";

import { Canvas } from "@react-three/fiber";
import { NoToneMapping } from "three";
import type { Quality } from "@/lib/shared";
import CameraRig from "./CameraRig";
import NameParticles from "./NameParticles";
import LogoParticles from "./LogoParticles";
import Tower from "./Tower";
import Dust from "./Dust";

const PAPER = "#efefec";

export default function Scene({ q }: { q: Quality }) {
  return (
    <Canvas
      dpr={[1, q.maxDpr]}
      shadows={q.shadows}
      camera={{ fov: 56, near: 0.1, far: 500, position: [0, 8, 62] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      style={{ position: "fixed", inset: 0 }}
    >
      <color attach="background" args={[PAPER]} />
      <fogExp2 attach="fog" args={[PAPER, 0.0065]} />
      <CameraRig shadows={q.shadows} />
      <Tower shadows={q.shadows} />
      <NameParticles q={q} />
      <NameParticles q={q} outro />
      <LogoParticles q={q} />
      <Dust q={q} />
    </Canvas>
  );
}
