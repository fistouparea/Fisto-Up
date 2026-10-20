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
| मेरा खेत (farm)        | Once: location (GPS or tehsil list), crops + sowing date, field size, water source     |
| होम (dashboard)        | Today's weather, alert, आज का काम, water advice, mandi prices, then "फोटो से जाँच"     |
| मौसम (weather)         | Today + 7 days, colored alerts (heat, frost, heavy rain, aandhi, dry spell) with advice |
| पानी की सलाह (water)    | Per crop: आज पानी दें / न दें / N दिन बाद, with the reason, rule-based                |
| फसल कैलेंडर (calendar)  | Stage timeline बुवाई → कटाई and today's tasks per crop                                 |
| सूचनाएँ (notifications)  | Alerts, tasks, "क्या फसल ठीक हुई?" follow-ups; optional web push                      |
| मंडी भाव (optional)     | Today's prices for the farmer's crops at nearby mandis                                |
| Offline                | Opens without internet and shows the last saved data with "आखिरी अपडेट"              |

```
frontend/  React + Vite + TS + Tailwind PWA ──/api──▶ backend/  Express + TS ──▶ Google Gemini (vision + chat)
                                                                ├──▶ MongoDB (history, farm, push; optional)
                                                                ├──▶ Open-Meteo (weather, free, no key)
                                                                ├──▶ data.gov.in Agmarknet (mandi, optional key)
                                                                └──▶ Web Push (VAPID, optional) + node-cron
```

## Requirements

- Node.js **22.9 or newer** (`node -v`)
- A free Google Gemini API key (see below)
- MongoDB for "मेरी जाँच", "मेरा खेत" and everything built on it (weather, water, calendar, notifications).
  Without MongoDB only the photo check and chat work. Or use Docker to run everything together.

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
| `VAPID_PUBLIC_KEY`  | no    | – (push off)            | Web push public key (see "Web push" below)                          |
| `VAPID_PRIVATE_KEY` | no    | – (push off)            | Web push private key. Keep secret                                   |
| `VAPID_SUBJECT`     | no    | – (push off)            | Contact for push services: `mailto:you@example.com`                 |
| `DATA_GOV_API_KEY`  | no    | – (mandi card hidden)   | Free key from https://data.gov.in (My Account → API key)            |

The server checks these at startup and refuses to start with a clear message if something is wrong.

`frontend/.env` is optional: set `VITE_API_BASE_URL` only if the API runs on a different domain in production.

### Web push (optional)

In-app सूचनाएँ always work. To also send notifications to the phone when the app is closed:

```bash
cd backend
npx web-push generate-vapid-keys     # prints a Public Key and a Private Key
```

Put them in `backend/.env` as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and set `VAPID_SUBJECT=mailto:you@example.com`,
then restart the backend. A job runs at **7:00 and 18:00 India time** and pushes at most 2 new items per phone
(most urgent first, never the same one twice). Push needs MongoDB, HTTPS and the production build
(the service worker is off in `npm run dev`), so test it through the Cloudflare tunnel below.
The app asks for permission only after the farmer has used it once, with a Hindi explanation.

### Mandi prices (optional)

Set `DATA_GOV_API_KEY` to show today's prices (Agmarknet, data.gov.in) for the farmer's crops at nearby mandis.
Without a key, or if the service fails, the card is simply hidden. Mandi names and crop keywords are in
`backend/src/data/mandis.ts`.

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

## Rules an expert can edit (⚠️ verify with KVK)

All farming rules are data, not code. A KVK expert can change numbers and Hindi texts here without touching logic:

| File | What |
| --- | --- |
| `backend/src/config/agroRules.ts` | Alert thresholds (heat 42°C, frost 4°C, heavy rain 50 mm, wind 50 km/h, dry spell) + advice texts; water rules, irrigation intervals per crop/stage, water tips |
| `backend/src/data/cropCalendar.ts` | Stage start days per crop and "आज का काम" tasks per stage |
| `backend/src/config/notificationRules.ts` | Follow-up timing (3–21 days), push limits and schedule |
| `backend/src/data/mandis.ts` | Nearby mandis and crop names in Agmarknet |
| `frontend/src/data/locations.ts` | Districts and tehsils (with coordinates) for the location list |

Tests check that the calendar and alerts never tell the farmer to water a crop in a stage where the water rules say "no irrigation".

## Screens (hash routes)

`#/` होम · `#/check` फोटो जाँच · `#/history` मेरी जाँच · `#/farm` मेरा खेत · `#/farm/setup` खेत की जानकारी ·
`#/weather` मौसम · `#/water` पानी की सलाह · `#/calendar` फसल कैलेंडर · `#/notifications` सूचनाएँ

## API

All errors: `{ "error": { "code": "..." } }`. The frontend turns each code into a Hindi message
(`frontend/src/strings/hi.ts`). Codes: `INVALID_INPUT` (400), `INVALID_IMAGE` (400), `FILE_TOO_LARGE` (413),
`NOT_FOUND` (404), `RATE_LIMITED` (429), `AI_ERROR` (502), `HISTORY_UNAVAILABLE` (503), `STORAGE_UNAVAILABLE` (503),
`WEATHER_UNAVAILABLE` (503), `AI_TIMEOUT` (504), `INTERNAL` (500).

**`POST /api/diagnose`** — `multipart/form-data`: `crop`, `image`, optional `deviceId` (UUID; saves to history).

- `crop`: `bajra | guar | moong | moth | chana | sarson | jeera | gehun | other`
- `200` → `{ "status": "ok", "diagnosis": { problem_name, explanation, desi_upay[], dawai[{name, kaise_use_karein}], savdhani[], severity? } }`
- `severity` (optional): `healthy` | `mild` | `serious`, shown as a green / yellow / red badge
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

**`POST /api/history/:id/follow-up`** — `{ deviceId, answer: "better" | "same" | "worse" }` → `{ "ok": true }`.

**Farm (all take `?deviceId=<uuid>`):**

| Endpoint | Returns |
| --- | --- |
| `GET /api/profile` | `{ profile }` (`null` before onboarding) |
| `PUT /api/profile` | body `{ deviceId, profile: { location?, crops[{crop, sowingDate}], fieldSizeBigha?, irrigation? } }` → `{ profile }` (GPS stored rounded to ~1 km) |
| `POST /api/profile/watered` | body `{ deviceId, crop }`: records "आज पानी दिया" |
| `GET /api/dashboard` | everything for the home screen in one request |
| `GET /api/weather` | `{ forecast, alerts }` (`forecast: null` without a location) |
| `GET /api/water` | `{ advice[{crop, status, inDays?, reason}], tips }` |
| `GET /api/calendar` | `{ crops[{crop, daysSinceSowing, stage, timeline, tasks}] }` |
| `GET /api/notifications` | `{ items[{id, type, severity, title, body, href}] }` (read state is kept on the phone) |
| `GET /api/mandi` | `{ available, prices[] }` |
| `GET /api/push/key` | `{ publicKey }` (`null` = push off) |
| `POST /api/push/subscribe` | body `{ deviceId, subscription }` |

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

Tests mock the AI, Open-Meteo, data.gov.in and web push, and use in-memory stores. To also test the MongoDB
repositories against a real database (they create and drop throwaway `agriai_test_*` databases):

```bash
cd backend && MONGO_URI_TEST=mongodb://localhost:27017 npm test
```

## Folder structure

```
backend/src/
  config/env.ts                   env validation (Zod)
  config/agroRules.ts             ⚠️ alert + water rules and texts (verify with KVK)
  config/notificationRules.ts     follow-up timing, push limits/schedule
  data/                           cropCalendar (stages + tasks), cropNames, mandis
  routes/  controllers/           diagnose, chat, history, profile, farm advice, push, mandi
  middleware/                     upload (multer, memory only), image type check, rate limit, error handler
  services/diagnosisService.ts    decides "ok" vs "unclear"
  services/dawaiSafety.ts         packet-dose note on every medicine
  services/ai/                    AiProvider interface, GeminiProvider, prompts, retry
  services/history/               HistoryRepository interface, MongoDB implementation, save helper
  services/farm/                  FarmProfileRepository, farmSnapshot (one view used by all farm endpoints + push)
  services/agro/                  cropStage, weatherAlerts, waterGuidance (pure rule engines)
  services/weather/               WeatherProvider + OpenMeteoProvider (cache, timeout, stale fallback)
  services/notifications/  push/  notification builder, web-push sender, subscriptions
  services/mandi/                 AgmarknetProvider
  jobs/                           push job + node-cron scheduler
  models/  db/                    Mongoose models, connection with retry
  types/  errors/
backend/tests/                    API + provider + repository tests (fake AI, in-memory history)
frontend/src/
  pages/                          Home, Diagnose, History(+Detail), Farm(+Setup), Weather, Water, Calendar, Notifications
  components/ui/                  design system: Button, IconButton, Card, Badge, Callout, SpeakButton, PageHeader,
                                  StepIndicator, EmptyState, BottomNav, Loader, Skeleton, StickyActions, toasts
  components/                     CropGrid + CropIcon (SVG), PhotoActions, ResultView, SeverityCard, ChatPanel, ...
  index.css                       design tokens (Tailwind v4 @theme): colors, font, shadows
  components/{farm,weather,water,calendar,notifications,home}/   feature components
  context/                        FarmProfileProvider, NotificationsProvider
  data/                           locations (tehsils), weather codes, icons per stage/alert/water status
  hooks/                          useCachedResource (offline copy), useDashboard, useWeather, useWater, useSpeech, ...
  api/                            fetch client (reports connectivity) + one module per endpoint group
  utils/                          compressImage, deviceId, offlineCache, connectivity, push, dates, ...
public/push-sw.js                 service worker push + notification-click handlers
  strings/hi.ts                   all Hindi text
docker-compose.yml                mongo + backend + frontend (nginx)
docs/screenshots/                 UI screenshots at 360px width
```

## Safety note

AI advice can be wrong. Every result screen tells the farmer to confirm with the nearest
Krishi Vigyan Kendra (KVK) before using any medicine.
