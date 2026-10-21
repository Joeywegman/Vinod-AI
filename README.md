# Vinod-AI

Concept: een scroll-gestuurde vlucht door een 3D Eiffeltoren, in zwart-wit fotostijl. Geen pagina's of blokken, alleen beeld.

- Duizenden puntjes vliegen samen tot de naam **VINOD-AI** voor de toren
- De camera vliegt onder de boog door, klimt door de poten en platforms, omhoog door de schacht en naar buiten door het vakwerk
- De AI-tools (Claude, ChatGPT/Codex, Replit, Base44, Wispr Flow, Lovable, Composio, Apollo, Gemini, Canva, Vercel, GitHub, Supabase) verschijnen alleen als puntenwolken onderweg
- Aan het eind vormt de naam opnieuw boven de top
- Fallback: statisch beeld (`public/poster.jpg`) bij `prefers-reduced-motion` of zonder WebGL (test met `?static`)

Stack: Next.js 15, React 19, TypeScript, Tailwind v4, react-three-fiber, eigen shaders.

```bash
npm install
npm run dev
```

Debug: `?q=high` of `?q=low` forceert de kwaliteit.
