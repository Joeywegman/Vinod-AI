"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { NoToneMapping } from "three";
import type { Quality } from "@/lib/shared";
import CameraRig from "./CameraRig";
import NameParticles from "./NameParticles";
import LogoParticles from "./LogoParticles";
import Hall from "./Hall";
import Coolant from "./Coolant";
import Dust from "./Dust";
import Core from "./Core";

export default function Scene({ q }: { q: Quality }) {
  return (
    <Canvas
      dpr={[1, q.maxDpr]}
      camera={{ fov: 56, near: 0.1, far: 400, position: [0, 1.7, 18] }}
      gl={{ antialias: !q.bloom, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      style={{ position: "fixed", inset: 0 }}
    >
      <color attach="background" args={["#04070d"]} />
      <fogExp2 attach="fog" args={["#04070d", 0.017]} />
      <CameraRig />
      <NameParticles q={q} />
      <LogoParticles q={q} />
      <Hall />
      <Coolant q={q} />
      <Dust q={q} />
      <Core />
      {q.bloom && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
