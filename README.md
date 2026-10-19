# AgriAI — Photo Diagnosis (by Fisto Up)

A farmer picks a crop, takes a photo of the plant, and gets the problem and its solution in simple Hindi.
Built for small farmers in Churu, Rajasthan: big buttons, few steps, works on slow mobile internet,
and installs on the phone like an app (PWA).

```
backend/    Node.js + Express + TypeScript   →  POST /api/diagnose  →  Google Gemini (vision)
frontend/   React + Vite + TypeScript + Tailwind, installable PWA
```

## Requirements

- Node.js **22.9 or newer** (`node -v`)
- A free Google Gemini API key (see below)

## 1. Get a free Gemini API key

1. Open **https://aistudio.google.com/apikey** and sign in with a Google account.
2. Click **Create API key** (accept the terms if asked; pick or create a project).
3. Copy the key. Keep it secret: never commit it or put it in frontend code.

The free tier has per-minute and per-day limits. When they are hit, the app retries and then shows
"अभी बहुत लोग जाँच करवा रहे हैं, थोड़ी देर बाद कोशिश करें।".
Note: on the free tier Google may use submitted content to improve its products. The app sends only the
crop photo (with location data removed) and the crop name, never any farmer details.

**Model name:** Gemini model names change over time. Check the current free **Flash** model that accepts images
in AI Studio and put it in `GEMINI_MODEL`.

## 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env      # then edit .env and paste your key
npm run dev               # http://localhost:4000
```

### Environment variables (`backend/.env`)

| Variable         | Required | Default                 | Meaning                                              |
| ---------------- | -------- | ----------------------- | ---------------------------------------------------- |
| `GEMINI_API_KEY` | yes      | –                       | Your Gemini API key                                  |
| `GEMINI_MODEL`   | yes      | –                       | e.g. `gemini-2.5-flash`                              |
| `AI_PROVIDER`    | no       | `gemini`                | Which AI provider to use                             |
| `PORT`           | no       | `4000`                  | Backend port                                         |
| `CORS_ORIGIN`    | no       | `http://localhost:5173` | Allowed frontend URL(s), comma-separated             |

The server checks these at startup and refuses to start with a clear message if something is missing.

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev               # prints a Local and a Network URL
```

Open the **Local** URL on your computer. In development Vite forwards `/api` to the backend on port 4000,
so no extra setup is needed. (If port 5173 is busy, Vite picks the next free port; that is fine.)

`frontend/.env` is optional: set `VITE_API_BASE_URL` only if the API runs on a different domain in production.

## 4. Test on your phone

**Same Wi-Fi (quickest):**

1. Connect the phone and the computer to the same Wi-Fi.
2. Start the backend and frontend as above.
3. On the phone, open the **Network** URL that `npm run dev` prints, e.g. `http://192.168.1.20:5173`.
   (Find your IP with `hostname -I` on Linux. If the page does not load, allow the port in your firewall,
   e.g. `sudo ufw allow 5173/tcp`.)
4. Pick a crop → **फोटो लें** should open the rear camera directly → take a photo → **जाँच करें**.

**Install as an app (needs HTTPS):** phones only offer "Install app" on HTTPS sites. A free Cloudflare tunnel
gives you a temporary HTTPS address:

```bash
cd frontend
npm run build && npm run preview          # http://localhost:4173, /api still goes to the backend
# in another terminal (install cloudflared first: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
cloudflared tunnel --url http://localhost:4173
```

Open the `https://….trycloudflare.com` address on the phone → Chrome menu → **Install app** / **Add to Home screen**.

## How it works

1. **Frontend** shrinks the photo to at most 1024px JPEG (a 3 MB photo becomes ~150–300 KB). Re-encoding also
   removes EXIF data such as GPS location.
2. **Backend** checks the crop id, the file size (max 5 MB) and the real file type from its bytes
   (JPEG/PNG/WebP), then sends only the image and crop name to the AI.
3. **Gemini** answers in JSON mode with a fixed schema; the backend validates it again with Zod.
4. If the photo is not a plant, or confidence is low, the backend returns `{ "status": "unclear" }` and
   no guess ever reaches the phone. The app asks for a clearer photo.
5. On HTTP 429/503 from Gemini, the backend retries 3 times with growing waits (1 s, 2 s, 4 s + jitter).
   Each attempt has a 30 s timeout.

### API

`POST /api/diagnose` — `multipart/form-data` with fields `crop` and `image`.

- `crop`: `bajra | guar | moong | moth | chana | sarson | jeera | gehun | other`
- `200` → `{ "status": "ok", "diagnosis": { problem_name, explanation, desi_upay[], dawai[{name, kaise_use_karein}], savdhani[] } }`
  or `{ "status": "unclear" }`
- Errors → `{ "error": { "code": "..." } }` with codes `INVALID_INPUT`, `INVALID_IMAGE`, `FILE_TOO_LARGE` (413),
  `RATE_LIMITED` (429), `AI_TIMEOUT` (504), `AI_ERROR` (502), `INTERNAL` (500). The frontend turns each code into
  a Hindi message (`frontend/src/strings/hi.ts`).

`GET /api/health` → `{ "status": "ok" }`

## Switching AI provider

All AI code is behind `AiProvider` in `backend/src/services/ai/aiProvider.ts`:

1. Add `backend/src/services/ai/<name>Provider.ts` implementing `diagnose()`.
2. Add a `case` for it in `createAiProvider.ts` and its name to `AI_PROVIDER` in `config/env.ts`.
3. Set `AI_PROVIDER=<name>` in `.env`.

The system prompt is in `services/ai/prompt.ts` and the expected JSON shape in `types/diagnosis.ts`.

## Scripts (in both `backend/` and `frontend/`)

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start in development mode       |
| `npm run build`     | Production build                |
| `npm test`          | Run tests (no API key needed)   |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript check                |

Backend production: `npm run build && npm start`.

## Folder structure

```
backend/src/
  config/env.ts                 env validation (Zod)
  routes/  controllers/         POST /api/diagnose
  middleware/                   upload (multer, memory only), image type check, rate limit, error handler
  services/diagnosisService.ts  decides "ok" vs "unclear"
  services/ai/                  AiProvider interface, GeminiProvider, prompt, retry
  types/  errors/
backend/tests/                  API + provider tests with a fake AI
frontend/src/
  pages/DiagnosePage.tsx        the whole flow: crop → photo → preview → checking → result
  components/                   CropPicker, PhotoPicker, PhotoPreview, ResultView, ...
  api/                          fetch client + shared types
  utils/compressImage.ts        resize + JPEG + strip EXIF
  strings/hi.ts                 all Hindi text
```

## Safety note

AI advice can be wrong. Every result screen tells the farmer to confirm with the nearest
Krishi Vigyan Kendra (KVK) before using any medicine.
