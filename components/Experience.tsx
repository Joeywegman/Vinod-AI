"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { scrollState } from "@/lib/scroll";
import { dwellT, LOGO_COUNT, tToScroll } from "@/lib/path";
import { detectQuality, type Quality } from "@/lib/shared";

const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Poster() {
  return (
    <div className="poster" role="img" aria-label="Vinod-AI">
      <h1 className="sr-only">Vinod-AI</h1>
    </div>
  );
}

export default function Experience() {
  const [mode, setMode] = useState<"pending" | "webgl" | "static">("pending");
  const [q, setQ] = useState<Quality | null>(null);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forceStatic = new URLSearchParams(location.search).has("static");
    if (reduce || forceStatic || !hasWebGL()) {
      setMode("static");
      return;
    }
    if (new URLSearchParams(location.search).has("debug"))
      (window as unknown as { __dwell: number[] }).__dwell = Array.from({ length: LOGO_COUNT }, (_, i) => tToScroll(dwellT(i)));
    setQ(detectQuality());
    setMode("webgl");
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      scrollState.p = p;
      setPct(Math.round(p * 100));
    };
    onScroll();
    scrollState.s = scrollState.p;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (mode === "static") return <Poster />;
  return (
    <>
      <h1 className="sr-only">Vinod-AI</h1>
      {mode === "webgl" && q && <Scene q={q} />}
      <div style={{ height: "900vh" }} aria-hidden />
      <div className="film" aria-hidden />
      <div className="hud" aria-hidden>
        <span className="hint" style={{ opacity: pct < 3 ? 1 : 0 }}>SCROLL</span>
        <div className="rail"><i style={{ height: `${pct}%` }} /></div>
      </div>
    </>
  );
}
