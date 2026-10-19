# AgriAI (by Fisto Up)

An AI farming helper for small farmers in Churu, Rajasthan. Simple Hindi, big buttons, few steps,
works on slow mobile internet, and installs on the phone like an app (PWA).

**Features**

| Feature              | What the farmer does                                                                  |
| -------------------- | ------------------------------------------------------------------------------------- |
| Photo diagnosis      | Picks the crop, takes a photo → gets समस्या, कारण, देसी उपाय, दवाई, सावधानी            |
| Safe medicine advice | Generic medicine names only, "पैकेट पर लिखी मात्रा के अनुसार ही डालें", safety warning |
| और पूछें (chat)       | Asks follow-up questions about the same diagnosis                                     |
| Hindi voice          | 🎤 speaks the question, 🔊 सुनें reads the result and answers aloud (free, in-browser) |
| मेरी जाँच (history)    | Sees past diagnoses on this phone (no login; anonymous device id)                     |

```
frontend/  React + Vite + TS + Tailwind PWA ──/api──▶ backend/  Express + TS ──▶ Google Gemini (vision + chat)
                                                                │
                                                                └──▶ MongoDB (history, optional)
```

## Requirements

- Node.js **22.9 or newer** (`node -v`)
- A free Google Gemini API key (see below)
- MongoDB (optional, only for "मेरी जाँच"), or Docker to run everything together

## 1. Get a free Gemini API key

1. Open **https://aistudio.google.com/apikey** and sign in with a Google account.
2. Click **Create API key** (accept the terms if asked; pick or create a project).
3. Copy the key. Keep it secret: never commit it or put it in frontend code.

The free tier has per-minute and per-day limits. When they are hit, the app retries and then shows
"अभी बहुत लोग जाँच करवा रहे हैं, थोड़ी देर बाद कोशिश करें।".
Note: on the free tier Google may use submitted content to improve its products. The app sends only the
crop photo (with location data removed), the crop name, the diagnosis and the farmer's chat questions,
never any personal details.

**Model name:** Gemini model names change over time. Check the current free **Flash** model that accepts images
in AI Studio and put it in `GEMINI_MODEL`.

## 2a. Run with npm (no Docker)

**Backend**

```bash
cd backend
npm install
cp .env.example .env      # then edit .env and paste your key
npm run dev               # http://localhost:4000
```

For "मेरी जाँच", MongoDB must run on the address in `MONGO_URI` (default `mongodb://localhost:27017/agriai`).
Without MongoDB (or with `MONGO_URI` removed) everything else still works; history is simply off.

**Frontend** (second terminal)

```bash
cd frontend
npm install
npm run dev               # prints a Local and a Network URL
```

Open the **Local** URL. In development Vite forwards `/api` to the backend on port 4000.
(If port 5173 is busy, Vite picks the next free port; that is fine.)

## 2b. Run with Docker (backend + frontend + MongoDB)

```bash
cp backend/.env.example backend/.env    # add GEMINI_API_KEY (MONGO_URI is set by compose)
docker compose up --build               # open http://localhost:8080
```

- `frontend` is served by nginx on port **8080** and forwards `/api` to `backend`.
- `mongo` keeps data in the `mongo-data` volume and is not exposed outside Docker.
- Stop with `docker compose down` (add `-v` only if you want to delete all saved history).

### Environment variables (`backend/.env`)

| Variable         | Required | Default                 | Meaning                                                             |
| ---------------- | -------- | ----------------------- | ------------------------------------------------------------------- |
| `GEMINI_API_KEY` | yes      | –                       | Your Gemini API key                                                 |
| `GEMINI_MODEL`   | yes      | –                       | e.g. `gemini-2.5-flash`                                             |
| `AI_PROVIDER`    | no       | `gemini`                | Which AI provider to use                                            |
| `PORT`           | no       | `4000`                  | Backend port                                                        |
| `MONGO_URI`      | no       | – (history off)         | e.g. `mongodb://localhost:27017/agriai`                             |
| `TRUST_PROXY`    | no       | `0`                     | Reverse proxies in front of the backend (compose sets `1` for nginx) |
| `CORS_ORIGIN`    | no       | `http://localhost:5173` | Allowed frontend URL(s), comma-separated                            |

The server checks these at startup and refuses to start with a clear message if something is wrong.

`frontend/.env` is optional: set `VITE_API_BASE_URL` only if the API runs on a different domain in production.

## 3. Test on your phone

**Same Wi-Fi (quickest):**

1. Connect the phone and the computer to the same Wi-Fi.
2. Start the app with npm (2a), or with Docker (2b).
3. On the phone open the **Network** URL that `npm run dev` prints (e.g. `http://192.168.1.20:5173`),
   or `http://<computer-ip>:8080` with Docker. Find the IP with `hostname -I`. If it does not load,
   allow the port in your firewall, e.g. `sudo ufw allow 5173/tcp`.

**HTTPS (needed for the 🎤 mic button and for "Install app"):** browsers allow the microphone and app
install only on HTTPS. A free Cloudflare tunnel gives a temporary HTTPS address:

```bash
cd frontend
npm run build && npm run preview          # http://localhost:4173, /api still goes to the backend
# in another terminal (install cloudflared first:
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
cloudflared tunnel --url http://localhost:4173
```

Open the `https://….trycloudflare.com` address on the phone. Chrome menu → **Install app** / **Add to Home screen**.
(With Docker, tunnel `http://localhost:8080` instead.)

## How it works

1. **Frontend** shrinks the photo to at most 1024px JPEG (a 3 MB photo becomes ~150–300 KB). Re-encoding also
   removes EXIF data such as GPS location.
2. **Backend** checks the crop id, the device id, the file size (max 5 MB) and the real file type from its bytes
   (JPEG/PNG/WebP), then sends only the image and crop name to the AI.
3. **Gemini** answers in JSON mode with a fixed schema; the backend validates it again with Zod.
4. If the photo is not a plant, or confidence is low, the backend returns `{ "status": "unclear" }` and
   no guess ever reaches the phone. The app asks for a clearer photo.
5. Medicine safety: the prompt asks for generic names only, no banned/highly toxic pesticides, dose only in
   general form, and KVK when unsure. The backend always appends "पैकेट पर लिखी मात्रा के अनुसार ही डालें।"
   to every medicine, and the screen shows a gloves/mask warning above the दवाई section.
6. Confident results are saved to MongoDB with the anonymous device id (never the photo). If MongoDB is down,
   the diagnosis is still returned; saving is skipped and logged.
7. Chat sends the crop, the earlier diagnosis and the last 10 messages (not the image). The answer is at most
   ~5 lines; non-farming questions get a polite "only farming" reply.
8. On HTTP 429/503 from Gemini, the backend retries 3 times with growing waits (1 s, 2 s, 4 s + jitter).
   Each attempt has a 30 s timeout. Diagnose and chat share one per-IP rate limit (30/min).

### Voice (Web Speech API, free)

- 🎤 uses the browser's `SpeechRecognition` with `hi-IN`. Spoken text fills the question box; the farmer taps पूछें.
  It needs HTTPS (or localhost). In Chrome the audio is processed by Google's speech service.
- 🔊 सुनें uses `speechSynthesis` with a Hindi voice when the phone has one.
- If the browser does not support either, the button is hidden. Typing always works.
- Code: `frontend/src/hooks/useSpeech.ts` (`useSpeechInput`, `useSpeechOutput`).

## API

All errors: `{ "error": { "code": "..." } }`. The frontend turns each code into a Hindi message
(`frontend/src/strings/hi.ts`). Codes: `INVALID_INPUT` (400), `INVALID_IMAGE` (400), `FILE_TOO_LARGE` (413),
`NOT_FOUND` (404), `RATE_LIMITED` (429), `AI_ERROR` (502), `HISTORY_UNAVAILABLE` (503), `AI_TIMEOUT` (504),
`INTERNAL` (500).

**`POST /api/diagnose`** — `multipart/form-data`: `crop`, `image`, optional `deviceId` (UUID; saves to history).

- `crop`: `bajra | guar | moong | moth | chana | sarson | jeera | gehun | other`
- `200` → `{ "status": "ok", "diagnosis": { problem_name, explanation, desi_upay[], dawai[{name, kaise_use_karein}], savdhani[] } }`
  or `{ "status": "unclear" }`

**`POST /api/chat`** — JSON:

```json
{
  "crop": "bajra",
  "diagnosis": { "problem_name": "...", "explanation": "...", "desi_upay": [], "dawai": [], "savdhani": [] },
  "messages": [{ "role": "user", "text": "ये दवाई कब डालूँ?" }]
}
```

`messages`: 1–10 items, `role` is `user` or `assistant`, the last one is the new question (max 500 chars).
`200` → `{ "answer": "..." }`

**`GET /api/history?deviceId=<uuid>&page=1&limit=10`** — latest first, `limit` max 50.
`200` → `{ "items": [{ id, crop, problemName, createdAt }], "page": 1, "limit": 10, "hasMore": false }`

**`GET /api/history/:id?deviceId=<uuid>`** — `200` → `{ id, crop, diagnosis, createdAt }`.
Returns `404` if the id belongs to another device.

**`GET /api/health`** → `{ "status": "ok" }`

## Switching AI provider

All AI code is behind `AiProvider` in `backend/src/services/ai/aiProvider.ts` (`diagnose()` and `chat()`):

1. Add `backend/src/services/ai/<name>Provider.ts` implementing both methods.
2. Add a `case` for it in `createAiProvider.ts` and its name to `AI_PROVIDER` in `config/env.ts`.
3. Set `AI_PROVIDER=<name>` in `.env`.

Prompts are in `services/ai/prompt.ts` (diagnosis + chat share the persona and medicine rules).

## Scripts (in both `backend/` and `frontend/`)

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start in development mode       |
| `npm run build`     | Production build                |
| `npm test`          | Run tests (no API key needed)   |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript check                |

Backend production: `npm run build && npm start`.

Tests mock the AI and use an in-memory history store. To also test the MongoDB repository against a real
database (it creates and drops a throwaway `agriai_test_*` database):

```bash
cd backend && MONGO_URI_TEST=mongodb://localhost:27017 npm test
```

## Folder structure

```
backend/src/
  config/env.ts                   env validation (Zod)
  routes/  controllers/           /api/diagnose, /api/chat, /api/history
  middleware/                     upload (multer, memory only), image type check, rate limit, error handler
  services/diagnosisService.ts    decides "ok" vs "unclear"
  services/dawaiSafety.ts         packet-dose note on every medicine
  services/ai/                    AiProvider interface, GeminiProvider, prompts, retry
  services/history/               HistoryRepository interface, MongoDB implementation, save helper
  models/  db/                    Mongoose model, connection with retry
  types/  errors/
backend/tests/                    API + provider + repository tests (fake AI, in-memory history)
frontend/src/
  pages/                          DiagnosePage, HistoryPage, HistoryDetailPage
  components/                     CropPicker, PhotoPicker, ResultView, ChatPanel, MicButton, SpeakButton, ...
  hooks/                          useChat, useSpeech, useHistory, useHashRoute
  api/                            fetch client + diagnose/chat/history + shared types
  utils/                          compressImage, deviceId, formatDate, speechText
  strings/hi.ts                   all Hindi text
docker-compose.yml                mongo + backend + frontend (nginx)
```

## Safety note

AI advice can be wrong. Every result screen tells the farmer to confirm with the nearest
Krishi Vigyan Kendra (KVK) before using any medicine.
