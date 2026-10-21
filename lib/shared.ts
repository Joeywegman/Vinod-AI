import * as THREE from "three";

/** Uniform objects shared by every custom shader (referenced, not cloned). */
export const shared = {
  uTime: { value: 0 },
  uCamS: { value: 0 },
  uFogColor: { value: new THREE.Color("#04070d") },
  uFogDensity: { value: 0.017 },
};

export const glslCommon = /* glsl */ `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
float fogF(float d){ float x = uFogDensity * d; return 1.0 - exp(-x * x); }
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float easeIO(float t){ return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }
`;

export function shaderMat(
  vertex: string,
  fragment: string,
  uniforms: Record<string, THREE.IUniform> = {},
  opts: THREE.ShaderMaterialParameters = {},
) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uTime: shared.uTime, uCamS: shared.uCamS, uFogColor: shared.uFogColor, uFogDensity: shared.uFogDensity, ...uniforms },
    ...opts,
  });
}

export type Quality = { mobile: boolean; name: number; logo: number; dust: number; flow: number; bloom: boolean; maxDpr: number };

export function detectQuality(): Quality {
  const force = typeof window !== "undefined" ? new URLSearchParams(location.search).get("q") : null;
  const mobile =
    force === "low" ||
    (force !== "high" &&
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4));
  return mobile
    ? { mobile, name: 9000, logo: 5500, dust: 1500, flow: 2400, bloom: false, maxDpr: 1.5 }
    : { mobile, name: 26000, logo: 10000, dust: 4500, flow: 7000, bloom: true, maxDpr: 1.75 };
}
