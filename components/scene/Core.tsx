"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CORE_POS } from "@/lib/path";

export default function Core() {
  const rings = useRef<THREE.Group>(null);
  const cube = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = rings.current;
    if (g) g.children.forEach((c, i) => ((c.rotation.x += dt * (0.25 + i * 0.12)), (c.rotation.y += dt * (0.2 - i * 0.07))));
    if (cube.current) {
      cube.current.rotation.y += dt * 0.4;
      cube.current.rotation.x += dt * 0.25;
    }
  });
  const glow = new THREE.Color(0.3, 1.3, 1.8);
  return (
    <group position={CORE_POS}>
      <group ref={cube}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(3, 3, 3)]} />
          <lineBasicMaterial color={glow} toneMapped={false} />
        </lineSegments>
        <mesh>
          <icosahedronGeometry args={[1.5, 2]} />
          <meshBasicMaterial color={new THREE.Color(0.1, 0.5, 0.9)} wireframe toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.6, 24, 16]} />
          <meshBasicMaterial color={new THREE.Color(1.8, 1.2, 0.8)} toneMapped={false} />
        </mesh>
      </group>
      <group ref={rings}>
        {[5, 7.5, 10].map((r, i) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.04, 8, 200]} />
            <meshBasicMaterial color={i === 1 ? new THREE.Color(2, 0.9, 0.4) : glow} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight color="#4fd8ff" intensity={400} distance={60} decay={2} />
    </group>
  );
}
