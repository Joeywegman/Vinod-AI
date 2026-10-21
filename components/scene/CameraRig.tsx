"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { camPath, CORE_POS, PATH_LEN, scrollToT } from "@/lib/path";
import { scrollState } from "@/lib/scroll";
import { shared } from "@/lib/shared";

const pos = new THREE.Vector3();
const tan = new THREE.Vector3();
const look = new THREE.Vector3();
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function CameraRig() {
  const cyan = useRef<THREE.PointLight>(null);
  const warm = useRef<THREE.PointLight>(null);
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
    look.lerp(CORE_POS, ss(0.88, 1, t));

    mouse.current.lerp(state.pointer, 1 - Math.exp(-dt * 3));
    const cam = state.camera as THREE.PerspectiveCamera;
    cam.position.copy(pos);
    cam.position.x += mouse.current.x * 0.35;
    cam.position.y += mouse.current.y * 0.2;
    cam.lookAt(look);
    const v = Math.abs(t - lastT.current) / Math.max(dt, 1e-3);
    lastT.current = t;
    speed.current += (Math.min(v * 12, 1) - speed.current) * (1 - Math.exp(-dt * 3));
    cam.rotateZ(Math.sin(t * 38) * 0.012 * speed.current + mouse.current.x * -0.02);
    const fov = 56 + speed.current * 14;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    cyan.current?.position.copy(pos).addScaledVector(tan, 3).setY(pos.y + 1);
    warm.current?.position.copy(pos).addScaledVector(tan, -4).setY(pos.y + 2.5);
  });

  return (
    <>
      <ambientLight intensity={0.5} color="#5f86b4" />
      <hemisphereLight args={["#4a7bb5", "#0a0f18", 0.6]} />
      <pointLight ref={cyan} color="#33d6ff" intensity={110} distance={32} decay={2} />
      <pointLight ref={warm} color="#ff9650" intensity={60} distance={26} decay={2} />
    </>
  );
}
