# AgriAI (by Fisto Up)

This folder is the AgriAI project. It is NOT the Churu ZP-PS election results portal:
the parent `Downloads/CLAUDE.md` (MySQL, sessions, election rules, plain CSS) does not apply here.
What does apply: plan first and wait for approval, strict TypeScript with no `any`, Zod validation,
never weaken tests, and run `npm test`, `npm run lint` and `npm run typecheck` in both apps before calling work done.

- Stack: backend Node 22 + Express 5 + TypeScript (ESM, NodeNext); frontend React + Vite + Tailwind v4 PWA.
- TypeScript is pinned to 6.0 because typescript-eslint does not support TS 7 yet.
- AI: Google Gemini via `@google/genai`, behind `backend/src/services/ai/aiProvider.ts`. Keep all AI calls behind that interface.
- Never send farmer personal data to the AI: only the image and crop name.
- If the photo is not a plant or confidence is low, never show a guess (`status: "unclear"`).
- All UI text is simple Hindi and lives in `frontend/src/strings/hi.ts`. Code is in English.
- Crop ids exist in both `backend/src/types/diagnosis.ts` and `frontend/src/api/types.ts`; keep them in sync.
- Not built yet (keep the structure open for them): login, database, chat, voice, weather, marketplace, Docker.
