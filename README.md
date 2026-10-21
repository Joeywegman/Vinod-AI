# Vinod-AI

Concept: een scroll-gestuurde vlucht door een digitaal datacenter. Geen pagina's of blokken, alleen beeld.

- Duizenden puntjes vliegen samen tot de naam **VINOD-AI**
- Camera vliegt door stalen ringen en A-frames, langs rekken, koelleidingen met stromende koelvloeistof en kabelgoten
- De AI-tools (Claude, ChatGPT/Codex, Replit, Base44, Wispr Flow, Lovable, Composio, Apollo, Gemini, Canva, Vercel, GitHub, Supabase) verschijnen alleen als puntenwolken waar je doorheen vliegt
- Fallback: statisch beeld bij `prefers-reduced-motion` of zonder WebGL (test met `?static`)

Stack: Next.js 15, React 19, TypeScript, Tailwind v4, react-three-fiber + drei, eigen shaders.

```bash
npm install
npm run dev
```

Debug: `?q=high` of `?q=low` forceert de kwaliteit.
