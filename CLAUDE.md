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
- Phase 2 farm features (weather, water, calendar, notifications, mandi) all read one `farmSnapshot`
  (`backend/src/services/farm/farmSnapshot.ts`). Rules and texts live in `config/agroRules.ts` and
  `data/cropCalendar.ts` (marked "verify with KVK"); never put thresholds in components or controllers.
- Alerts/calendar must never tell the farmer to water a crop in a stage where IRRIGATION_INTERVAL_DAYS is null
  (tests enforce this).
- External APIs (Open-Meteo, data.gov.in, web push) sit behind small provider interfaces with timeouts and are
  mocked in tests. Empty optional env values must be treated as "not set".
- Frontend routes: `#/` home dashboard, `#/check` photo check (see `hooks/useHashRoute.ts`).
- Not built yet: phone OTP, PIN reset in the app, online payments (buyers pay sellers directly).
- Phase 4 rules: changing an AI prompt = bump its version in `services/ai/promptVersions.ts` + `npm run prompts:snapshot`
  (a test enforces it). Product events only via `track()` (`modules/metrics/events.ts`) with fixed values, never personal
  data. Coordinator actions are audited with `audit()`. New device-linked data must be added to "मेरा डेटा"
  (`DeviceDataSource` in `modules/privacy/privacy.service.ts`). New thresholds/limits go in `config/`.
- If the rolldown binding is still missing after a clean reinstall:
  `npm install --no-save @rolldown/binding-linux-x64-gnu@<rolldown version>`.
