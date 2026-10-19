# AgriAI (by Fisto Up)

This folder is the AgriAI project. It is NOT the Churu ZP-PS election results portal:
the parent `Downloads/CLAUDE.md` (MySQL, sessions, election rules, plain CSS) does not apply here.
What does apply: plan first and wait for approval, strict TypeScript with no `any`, Zod validation,
never weaken tests, and run `npm test`, `npm run lint` and `npm run typecheck` in both apps before calling work done.

- Stack: backend Node 22 + Express 5 + TypeScript (ESM, NodeNext); frontend React + Vite + Tailwind v4 PWA.
- TypeScript is pinned to 6.0 because typescript-eslint does not support TS 7 yet.
- AI: Google Gemini via `@google/genai`, behind `backend/src/services/ai/aiProvider.ts`. Keep all AI calls behind that interface.
- Never send farmer personal data to the AI: diagnose sends only the image and crop name; chat sends only the
  crop, the earlier diagnosis and the chat messages (never the image or device id).
- If the photo is not a plant or confidence is low, never show a guess (`status: "unclear"`).
- All UI text is simple Hindi and lives in `frontend/src/strings/hi.ts`. Code is in English.
- Crop ids exist in both `backend/src/types/diagnosis.ts` and `frontend/src/api/types.ts`; keep them in sync.
- Medicine rules live once in `prompt.ts` (DAWAI_RULES) and `services/dawaiSafety.ts`; diagnosis and chat both use them.
- History: MongoDB via Mongoose behind `services/history/historyRepository.ts`. It is optional: diagnosis must
  work when MongoDB is down or MONGO_URI is unset. Never store the photo.
- The local MongoDB on this machine has other projects' databases (FistoUp, DM-platform, sportDB): never touch them.
  Tests use throwaway `agriai_test_*` databases only.
- Voice uses only the browser Web Speech API (`frontend/src/hooks/useSpeech.ts`); hide buttons when unsupported.
- After `npm install <pkg>`, check `node_modules/@rolldown/` still has the native binding (npm optional-deps bug);
  if not, reinstall cleanly (remove node_modules + package-lock.json, then `npm install`).
- Not built yet: login, weather, marketplace.
