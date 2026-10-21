"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { camPath, PATH_LEN, scrollToT, TOP_POS } from "@/lib/path";
import { scrollState } from "@/lib/scroll";
import { shared } from "@/lib/shared";

const pos = new THREE.Vector3();
const tan = new THREE.Vector3();
const look = new THREE.Vector3();
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function CameraRig({ shadows }: { shadows: boolean }) {
  const speed = useRef(0);
  const lastT = useRef(0);
  const mouse = useRef(new THREE.Vector2());

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    shared.uTime.value = state.clock.elapsedTime;
    scrollState.s += (scrollState.p - scrollState.s) * (1 - Math.exp(-dt * 5));
    const t = scrollToT(scrollState.s);
    shared.uCamS.value = t * PATH_LEN;
    camPath.getPointAt(t, pos);
    camPath.getTangentAt(t, tan);
    look.copy(pos).addScaledVector(tan, 10);
    // tilt up at the start so the tower fills the frame behind the name
    look.y += 5 * (1 - ss(0.05, 0.22, t));
    look.lerp(TOP_POS, ss(0.88, 1, t));

    mouse.current.lerp(state.pointer, 1 - Math.exp(-dt * 3));
    const cam = state.camera as THREE.PerspectiveCamera;
    cam.position.copy(pos);
    cam.position.x += mouse.current.x * 0.35;
    cam.position.y += mouse.current.y * 0.2;
    cam.lookAt(look);
    const v = Math.abs(t - lastT.current) / Math.max(dt, 1e-3);
    lastT.current = t;
    speed.current += (Math.min(v * 12, 1) - speed.current) * (1 - Math.exp(-dt * 3));
    cam.rotateZ(Math.sin(t * 30) * 0.015 * speed.current + mouse.current.x * -0.02);
    const fov = 56 + speed.current * 12;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <>
      <hemisphereLight args={["#ffffff", "#9a9a96", 1.6]} />
      <directionalLight
        position={[-40, 80, 50]}
        intensity={2.2}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={70}
        shadow-camera-bottom={-20}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
      />
    </>
  );
}
