type Draw = (c: CanvasRenderingContext2D) => void;
export type Logo = { name: string; draw: Draw };

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};
const rays = (c: CanvasRenderingContext2D, n: number, r0: number, r1: (i: number) => number, w: number) => {
  c.lineCap = "round";
  c.lineWidth = w;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    c.beginPath();
    c.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
    c.lineTo(128 + Math.cos(a) * r1(i), 128 + Math.sin(a) * r1(i));
    c.stroke();
  }
};
const cut = (c: CanvasRenderingContext2D, fn: () => void) => {
  c.globalCompositeOperation = "destination-out";
  fn();
  c.globalCompositeOperation = "source-over";
};

export const LOGOS: Logo[] = [
  { name: "Claude", draw: (c) => rays(c, 12, 24, (i) => (i % 2 ? 98 : 80), 13) },
  {
    name: "ChatGPT / Codex",
   
    draw: (c) => {
      c.lineWidth = 12;
      c.lineJoin = "round";
      for (let i = 0; i < 6; i++) {
        c.save();
        c.translate(128, 128);
        c.rotate((i * Math.PI) / 3);
        c.beginPath();
        c.roundRect(-24, -104, 48, 96, 24);
        c.stroke();
        c.restore();
      }
    },
  },
  {
    name: "Replit Agent",
   
    draw: (c) => {
      rr(c, 44, 40, 100, 48, 8);
      rr(c, 44, 104, 62, 48, 8);
      rr(c, 122, 104, 90, 48, 8);
      rr(c, 44, 168, 62, 48, 8);
    },
  },
  {
    name: "Base44",
   
    draw: (c) => {
      c.beginPath();
      c.arc(128, 116, 92, Math.PI, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(128, 140, 92, 0, Math.PI);
      c.fill();
    },
  },
  {
    name: "Wispr Flow",
   
    draw: (c) => {
      const h = [40, 92, 62, 134, 104, 158, 72, 116, 50];
      h.forEach((v, i) => rr(c, 22 + i * 24, 128 - v / 2, 15, v, 7));
    },
  },
  {
    name: "Lovable",
   
    draw: (c) => {
      c.beginPath();
      c.moveTo(128, 218);
      c.bezierCurveTo(20, 140, 8, 60, 70, 44);
      c.bezierCurveTo(105, 36, 125, 60, 128, 80);
      c.bezierCurveTo(131, 60, 151, 36, 186, 44);
      c.bezierCurveTo(248, 60, 236, 140, 128, 218);
      c.fill();
    },
  },
  {
    name: "Composio",
   
    draw: (c) => {
      rr(c, 36, 36, 184, 184, 24);
      cut(c, () => {
        rr(c, 78, 78, 100, 100, 10);
        rr(c, 150, 104, 90, 48, 0);
      });
    },
  },
  { name: "Apollo", draw: (c) => rays(c, 8, 34, () => 100, 18) },
  {
    name: "Gemini",
   
    draw: (c) => {
      c.beginPath();
      c.moveTo(128, 16);
      c.quadraticCurveTo(128, 128, 240, 128);
      c.quadraticCurveTo(128, 128, 128, 240);
      c.quadraticCurveTo(128, 128, 16, 128);
      c.quadraticCurveTo(128, 128, 128, 16);
      c.fill();
    },
  },
  {
    name: "Canva",
   
    draw: (c) => {
      c.beginPath();
      c.arc(128, 128, 104, 0, Math.PI * 2);
      c.fill();
      cut(c, () => {
        c.font = "italic 700 170px Georgia, 'Times New Roman', serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("C", 128, 138);
      });
    },
  },
  {
    name: "Vercel",
   
    draw: (c) => {
      c.beginPath();
      c.moveTo(128, 30);
      c.lineTo(232, 210);
      c.lineTo(24, 210);
      c.closePath();
      c.fill();
    },
  },
  {
    name: "GitHub",
   
    draw: (c) => {
      c.beginPath();
      c.arc(128, 132, 100, 0, Math.PI * 2);
      c.fill();
      [
        [58, 58, 98, 54, 70, 96],
        [198, 58, 158, 54, 186, 96],
      ].forEach(([a, b, c1, d, e, f]) => {
        c.beginPath();
        c.moveTo(a, b);
        c.lineTo(c1, d);
        c.lineTo(e, f);
        c.fill();
      });
      cut(c, () => {
        c.beginPath();
        c.arc(128, 150, 54, 0, Math.PI);
        c.fill();
        c.beginPath();
        c.arc(100, 118, 10, 0, Math.PI * 2);
        c.arc(156, 118, 10, 0, Math.PI * 2);
        c.fill();
      });
    },
  },
  {
    name: "Supabase",
   
    draw: (c) => {
      c.beginPath();
      [[152, 18], [48, 140], [122, 140], [104, 238], [208, 112], [134, 112]].forEach(([x, y], i) =>
        i ? c.lineTo(x, y) : c.moveTo(x, y),
      );
      c.closePath();
      c.fill();
    },
  },
];

/** Returns `count` points in [-1,1]^2 (x right, y up) filling the logo shape. */
export function sampleLogo(logo: Logo, count: number): Float32Array {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#fff";
  c.strokeStyle = "#fff";
  logo.draw(c);
  const d = c.getImageData(0, 0, S, S).data;
  const px: number[] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 128) px.push(x, y);
  const out = new Float32Array(count * 2);
  const n = px.length / 2;
  for (let i = 0; i < count; i++) {
    const k = n ? Math.floor(Math.random() * n) : 0;
    out[i * 2] = ((px[k * 2] ?? 128) + Math.random() - 0.5) / (S / 2) - 1;
    out[i * 2 + 1] = -(((px[k * 2 + 1] ?? 128) + Math.random() - 0.5) / (S / 2) - 1);
  }
  return out;
}
