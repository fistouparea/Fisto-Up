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
| **बाज़ार (marketplace)** | Phase 3, see [Marketplace](#marketplace-phase-3) below                               |
| बेचें (Snap & List)     | Seller takes a photo and speaks "दस क्विंटल बाजरा, पच्चीस सौ रुपये" → AI fills the listing |
| Fair price             | Mandi range (Agmarknet) or similar listings / AI estimate, clearly a suggestion       |
| खरीदें                  | Buyers browse, filter, order or ask a bulk price; pay the seller directly by UPI or cash |
| Orders                 | Accept/reject with voice alert, stock reserved safely, UPI QR, rating, problem reports |
| संयोजक पैनल             | Verify sellers, moderate, orders board, assisted listing, commission ledger + CSV     |
| **Pilot (Phase 4)**    | See [Production + pilot](#production--pilot-phase-4) below                            |
| सहमति + मेरा डेटा       | First-run consent (Hindi, 🔊); download all data; delete it (orders kept anonymized)  |
| क्या जवाब सही था?       | 👍 / 👎 after every diagnosis, optional spoken or typed comment                        |
| मदद/शिकायत              | Help button in the app bar: topic + spoken/typed message, seen by coordinators        |
| Pilot Dashboard        | Weekly active farmers, diagnoses, 👍 rate by crop, follow-ups, market, price vs mandi + CSV |

```
frontend/  React + Vite + TS + Tailwind PWA ──/api──▶ backend/  Express + TS ──▶ Google Gemini (vision + chat)
                                                                ├──▶ MongoDB (history, farm, push; marketplace needs a replica set)
                                                                ├──▶ Open-Meteo (weather, free, no key)
                                                                ├──▶ data.gov.in Agmarknet (mandi, optional key)
                                                                └──▶ Web Push (VAPID, optional) + node-cron
```

## Requirements

- Node.js **22.9 or newer** (`node -v`)
- A free Google Gemini API key (see below)
- MongoDB for "मेरी जाँच", "मेरा खेत" and everything built on it (weather, water, calendar, notifications).
  Without MongoDB only the photo check and chat work. Or use Docker to run everything together.
- The marketplace additionally needs MongoDB as a **replica set** (orders use transactions) and a `JWT_SECRET`.
  Docker sets up the replica set for you; for npm see [MongoDB replica set](#mongodb-replica-set-for-npm-dev).

**Deploying for the pilot:** see [DEPLOY.md](DEPLOY.md) (Render + MongoDB Atlas + Cloudinary + Sentry, in Hinglish).

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
in AI Studio and put it in `GEMINI_MODEL` (now `gemini-3.8-flash`; `gemini-2.5-flash` is no longer available to
new users). Keep `GEMINI_THINKING_LEVEL=low`: with the model's default thinking a photo check took ~90 seconds,
with `low` it takes about 20 seconds.

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
cp backend/.env.example backend/.env    # add GEMINI_API_KEY and JWT_SECRET (MONGO_URI is set by compose)
docker compose up --build               # open http://localhost:8080
```

- `frontend` is served by nginx on port **8080** and forwards `/api` to `backend`.
- `mongo` keeps data in the `mongo-data` volume and is not exposed outside Docker. It runs as a single-node
  replica set (`rs0`), started automatically by its healthcheck; the backend waits until it is healthy.
- Stop with `docker compose down` (add `-v` only if you want to delete all saved history).

### Environment variables (`backend/.env`)

| Variable         | Required | Default                 | Meaning                                                             |
| ---------------- | -------- | ----------------------- | ------------------------------------------------------------------- |
| `GEMINI_API_KEY` | yes      | –                       | Your Gemini API key                                                 |
| `GEMINI_MODEL`   | yes      | –                       | e.g. `gemini-3.8-flash`                                             |
| `GEMINI_FALLBACK_MODELS` | no | – (none)             | Comma-separated models tried when `GEMINI_MODEL` is busy ("high demand"), slow or gives bad JSON, e.g. `gemini-3.5-flash,gemini-3.1-flash-lite` |
| `GEMINI_ATTEMPT_TIMEOUT_SECONDS` | no | `45`        | Seconds one model may take before the next attempt/fallback (5–120). 25 = faster fallback when busy |
| `AI_PROVIDER`    | no       | `gemini`                | Which AI provider to use                                            |
| `GEMINI_THINKING_LEVEL` | no | `low`                | `low` / `medium` / `high`, or `off` for older models                |
| `PORT`           | no       | `4000`                  | Backend port                                                        |
| `MONGO_URI`      | no       | – (history off)         | e.g. `mongodb://localhost:27017/agriai`                             |
| `TRUST_PROXY`    | no       | `0`                     | Reverse proxies in front of the backend (compose sets `1` for nginx) |
| `CORS_ORIGIN`    | no       | `http://localhost:5173` | Allowed frontend URL(s), comma-separated                            |
| `VAPID_PUBLIC_KEY`  | no    | – (push off)            | Web push public key (see "Web push" below)                          |
| `VAPID_PRIVATE_KEY` | no    | – (push off)            | Web push private key. Keep secret                                   |
| `VAPID_SUBJECT`     | no    | – (push off)            | Contact for push services: `mailto:you@example.com`                 |
| `DATA_GOV_API_KEY`  | no    | – (mandi card hidden)   | Free key from https://data.gov.in (My Account → API key). Also used for the marketplace fair price |
| `JWT_SECRET`        | for marketplace | – (marketplace off) | Signs the login cookie. At least 32 random characters: `openssl rand -hex 32`. Keep secret |
| `COOKIE_SECURE`     | no    | `true` when `NODE_ENV=production` | Login cookie only over HTTPS. Set `false` only to test over plain http on Wi-Fi |
| `COMMISSION_PERCENT`| no    | `3`                     | Our commission on completed orders, 2–5 (%)                          |
| `NODE_ENV`          | no    | `development`           | `production` makes `CORS_ORIGIN`, `MONGO_URI` and `JWT_SECRET` required |
| `LOG_LEVEL`         | no    | `info`                  | `fatal` … `debug`; JSON logs with request ids (pino), no personal data |
| `SENTRY_DSN`        | no    | – (off)                 | Sentry error tracking for the backend (free tier)                    |
| `SENTRY_ENVIRONMENT`| no    | `NODE_ENV`              | Name shown in Sentry, e.g. `pilot`                                    |
| `STORAGE_PROVIDER`  | no    | `database`              | Listing photos: `database` (MongoDB) or `cloudinary` (production)     |
| `CLOUDINARY_URL`    | with cloudinary | –             | `cloudinary://<key>:<secret>@<cloud>` from the Cloudinary dashboard. Keep secret |
| `CLOUDINARY_FOLDER` | no    | `agriai/listings`       | Folder for listing photos                                             |
| `INVITE_ONLY`       | no    | `false`                 | Pilot: sign-up only with an invite code (coordinators can change it later) |
| `METRICS_SALT`      | no    | `JWT_SECRET`            | Key for the weekly pseudonyms in usage events (min 16 characters)     |

The server checks these at startup and refuses to start with a clear message if something is wrong.

`frontend/.env` is optional: set `VITE_API_BASE_URL` only if the API runs on a different domain in production,
and `VITE_SENTRY_DSN` for frontend error tracking (Sentry is not even downloaded without it).

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
   Each attempt has a 45 s timeout. Diagnose and chat share one per-IP rate limit (30/min).

### Voice (Web Speech API, free)

- 🎤 uses the browser's `SpeechRecognition` with `hi-IN`. Spoken text fills the question box; the farmer taps पूछें.
  It needs HTTPS (or localhost). In Chrome the audio is processed by Google's speech service.
- 🔊 सुनें uses `speechSynthesis` with a Hindi voice when the phone has one.
- If the browser does not support either, the button is hidden. Typing always works.
- Code: `frontend/src/hooks/useSpeech.ts` (`useSpeechInput`, `useSpeechOutput`).

## Marketplace (Phase 3)

Farmers and SHG (self-help group) women of Churu sell grain, pulses and SHG products (achar, papad, masale,
ker-sangri, handicraft) to shops, hotels, traders (B2B) and households (B2C). **No money passes through the app:**
the buyer pays the seller directly by UPI (deep link + QR) or cash. Our income is a commission (default 3%,
`COMMISSION_PERCENT`) recorded per completed order in a ledger and collected offline by coordinators.

The advisor (photo check, chat, farm, weather …) works exactly as before, with or without login.

### Roles

| Role | Signs up | Can |
| --- | --- | --- |
| `seller` | in the app (`#/register` → "बेचना है") | fill profile (village, SHG, UPI ID, pickup place), list with Snap & List, edit/pause listings, accept/reject orders, confirm "पैसे मिल गए". Listings are public only after a coordinator verifies the seller. Changing the UPI ID sends a verified seller back to "pending". |
| `buyer` | in the app ("खरीदना है", household or business) | browse (also without login), order, ask a bulk price, pay, confirm receipt, rate, report |
| `coordinator` | **only** with the server script below | everything in `#/admin`, and every seller step on an order (for sellers who cannot use the app) |

Login is phone number + 4-digit PIN (bcrypt; easy PINs like 1234/1111 refused; 5 wrong PINs lock the account
for 15 minutes; per-IP rate limit). The session is a JWT in an httpOnly, SameSite=Strict cookie (`Secure` in
production). Logout ends all sessions of the account. Every write needs the `X-Requested-With: agriai` header
(CSRF defence). Auth is behind `CredentialMethod` (`modules/auth/credentials.ts`) so phone OTP can be added later.

On first login the phone's anonymous advisor data (farm profile, "मेरी जाँच") is linked to the account. On
another phone the app switches to the account's data.

### Create the first coordinator

```bash
cd backend
npm run create-coordinator -- --phone 9876543210 --name "Sunita Sharma"     # asks for a 4-digit PIN (hidden)
# Docker:
docker compose exec backend node dist/scripts/createCoordinator.js --phone 9876543210 --name "Sunita Sharma"
```

The PIN can also come from `COORDINATOR_PIN=1357` (e.g. in scripts). Then log in at `#/login`; the coordinator
lands on `#/admin`. Coordinators can add more sellers themselves (संयोजक पैनल → विक्रेता → नया विक्रेता जोड़ें).

### Demo data

```bash
cd backend && npm run seed          # Docker: docker compose exec backend node dist/scripts/seed.js
```

Creates (every demo PIN is **2580**):

| Phone | Who |
| --- | --- |
| 9000000001 | coordinator |
| 9000000101 – 9000000104 | verified sellers (रमेश, सुनीता SHG, मोहन, कमला SHG) |
| 9000000105 | pending seller (गीता) |
| 9000000201 | business buyer (होटल मरुधर) |
| 9000000202 | household buyer |
| 9000000106 | input dealer (खाद-बीज-दवाई, licence checked) |
| 9000000203 | worker (मज़दूर, 18+ confirmed) |

plus 12 listings with drawn demo photos (`backend/seed-assets/`), orders in every main state (two completed with
commission and ratings, one collected), and one open report. Running it again removes only earlier demo data
(`demo: true`); real accounts are never touched.
Phase 5/6 demo data (`backend/src/scripts/seedPhase5.ts`): input dealer products + one kit-referral order, 2 machines with
calendars and bookings, a worker and a matching work need, an approved cow and a goat waiting for approval, an open mandi
trip with 2 farmers and a cancelled one, and a farm profile + 2 saved checks on the household buyer's phone
(device id `00000000-0000-4000-8000-000000000202`, linked on login). Schemes come from `backend/src/data/schemes.ts`.

### MongoDB replica set (for npm dev)

Orders reserve stock inside a MongoDB transaction, which needs a replica set. Docker does this for you. With npm,
run a separate MongoDB as a single-node replica set, e.g.:

```bash
docker run -d --name agriai-mongo -p 27018:27017 mongo:8.0 --replSet rs0 --bind_ip_all
docker exec agriai-mongo mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
# backend/.env
MONGO_URI=mongodb://localhost:27018/agriai?directConnection=true
```

Without a replica set the backend logs a warning at startup. Signing up, listing products and browsing still
work; placing or accepting an order answers `NEEDS_REPLICA_SET` (503) and the app shows a clear message.

### Business rules (edit here, not in code)

| File | What |
| --- | --- |
| `backend/src/config/marketRules.ts` | PIN/lockout/session rules, commission (default/min/max + rounding), listing limits, fair-price bands, order limits |
| `backend/src/config/marketCatalog.ts` | Products (grains + SHG), allowed units, food (FSSAI field), mandi crop. Mirrored in `frontend/src/api/marketTypes.ts` + `data/marketCatalog.ts` |
| `backend/src/config/marketMessages.ts` | Hindi notification texts per order step |
| `backend/src/modules/orders/orderStateMachine.ts` | **The** order state machine: every allowed step, who may take it, and its effect (reserve/release stock, record commission) |

Order states: `requested → accepted/rejected → ready → out_for_delivery | ready_for_pickup → delivered → paid → completed`, plus `cancelled`.
Accepting takes the stock with a conditional atomic update inside a transaction (two accepts can never oversell);
cancelling an accepted order gives it back. Money is always **integer paise**; commission is rounded half up.
Phone numbers are shared only after the seller accepts. A B2B "भाव पूछें" is an order with an offered price
(only on bulk listings with a minimum order, ≥ 50% of the listed price).

Only the product photo and the seller's words (phone numbers removed) are sent to the AI for Snap & List; only
the product name and unit for an SHG price estimate. The AI's JSON is validated with Zod; the seller confirms
and sets the final price. If the AI fails, the seller fills the form by hand; listing is never blocked.

## Production + pilot (Phase 4)

Details, decisions and numbers: CHANGES.md → "Phase 4". Deployment: [DEPLOY.md](DEPLOY.md).

- **Security:** helmet with a strict CSP (API) and a CSP + security headers for the app (`frontend/nginx/`),
  CORS only from `CORS_ORIGIN`, per-IP limits for all API traffic, writes and AI (`config/securityRules.ts`),
  PIN lockout, env checked at startup, an access-control test for every protected route, and an append-only
  **audit log** of coordinator actions (`#/admin/audit`).
- **Reliability:** pino JSON logs with a request id (PINs, phones, tokens, photos never logged), optional Sentry
  (backend + frontend), Hindi error screen, `GET /health` (alive) and `GET /ready` (MongoDB), graceful shutdown,
  timeouts + retries on Gemini, weather, mandi, web push and Cloudinary, indexes checked by a test
  (`npm run check-indexes` against a real database), slow-query log.
- **Deployment:** small non-root Docker images, `docker-compose.prod.yml` (nginx: gzip, caching, HTTPS),
  `render.yaml`, photos behind `PhotoStorage` (MongoDB or Cloudinary), GitHub Actions CI, daily encrypted backup
  (`scripts/backup.sh`, `scripts/restore.sh`, `.github/workflows/backup.yml`).
- **Privacy (DPDP basics):** first-run consent (recorded with version + time), draft Privacy Policy and Terms in
  Hindi + English (`#/privacy`, `#/terms`, ⚠️ need legal review), **मेरा डेटा** (`#/my-data`): download everything,
  delete everything (orders stay for accounting, without name, village or address).
- **Pilot mode:** feature flags (`off` / `pilot` / `all`, `config/featureFlags.ts`, changed in `#/admin/flags`),
  invite codes (`#/admin/invites`), AI feedback, help requests (`#/help`, `#/admin/help`).
- **Metrics:** own events in MongoDB with weekly pseudonyms (no device id, 400-day TTL) and the Pilot Dashboard
  (`#/admin/pilot`) with a CSV per metric.
- **AI quality:** labelled photos in `eval/photos`, `npm run eval` → reports in `eval/reports`; versioned prompts in
  `eval/prompts` (see [eval/README.md](eval/README.md)).
- **Performance:** screens load on demand (main JS 96 KB gzip), Lighthouse mobile 91 / 100 / 96,
  load test `npm run loadtest` (results in `backend/loadtest/results/`).

## Phase 5 (pilot features)

Details, decisions and what is not finished: CHANGES.md → "Phase 5". Every feature has a flag (default `pilot`).

| Feature | Screen | Rules / content |
| --- | --- | --- |
| ज़रूरी सामान (AI-Kit) | under every diagnosis | `config/inputRules.ts` (blocklist, radius), `data/inputGenerics.ts` (generic names) |
| Input dealers (खाद-बीज-दवाई) | seller profile, admin → विक्रेता (licence check) | ledger type `partner_referral` |
| बोलकर चलाएँ + पढ़कर सुनाएँ | 🎤 on every farmer screen, `#/settings` | `config/voiceIntents.ts` |
| हिंदी / English / राजस्थानी | `#/settings` | `frontend/src/strings/{hi,enApp,en,raj}.ts`, `data/dialectGlossary.ts` |
| सरकारी योजनाएँ | `#/schemes`, admin → योजनाएँ | `data/schemes.ts` (only verified facts; rest "verify") |
| Machines / workers / animals | `#/services/<equipment|labour|livestock>`, `#/services/my` | `config/serviceKinds.ts`, `modules/services/bookingStateMachine.ts` |
| साथ में मंडी चलें | `#/mandi-trips`, admin → मंडी गाड़ी | `config/logisticsRules.ts` |
| Delivery tracking (Phase 6) | admin → ऑर्डर → डिलीवरी वाले का लिंक, `#/delivery/<token>` (no login) | `config/logisticsRules.ts` |
| शिकायत (Phase 6) | "शिकायत करें" on orders/bookings/listings, `#/complaints`, admin → शिकायत कतार | `config/complaintRules.ts` |

Launch steps and phone tests: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Rules an expert can edit (⚠️ verify with KVK)

All farming rules are data, not code. A KVK expert can change numbers and Hindi texts here without touching logic:

| File | What |
| --- | --- |
| `backend/src/config/agroRules.ts` | Alert thresholds (heat 42°C, frost 4°C, heavy rain 50 mm, wind 50 km/h, dry spell) + advice texts; water rules, irrigation intervals per crop/stage, water tips |
| `backend/src/data/cropCalendar.ts` | Stage start days per crop and "आज का काम" tasks per stage |
| `backend/src/config/notificationRules.ts` | Follow-up timing (3–21 days), push limits and schedule |
| `backend/src/services/dawaiSafety.ts` | Banned / red-label pesticides the AI evaluation flags for review |
| `backend/src/data/mandis.ts` | Nearby mandis and crop names in Agmarknet |
| `frontend/src/data/locations.ts` | Districts and tehsils (with coordinates) for the location list |

Tests check that the calendar and alerts never tell the farmer to water a crop in a stage where the water rules say "no irrigation".

## Screens (hash routes)

`#/` होम · `#/check` फोटो जाँच · `#/history` मेरी जाँच · `#/farm` मेरा खेत · `#/farm/setup` खेत की जानकारी ·
`#/weather` मौसम · `#/water` पानी की सलाह · `#/calendar` फसल कैलेंडर · `#/notifications` सूचनाएँ

Phase 4: `#/privacy` · `#/terms` · `#/my-data` मेरा डेटा · `#/help` मदद/शिकायत ·
`#/admin/pilot` · `#/admin/help` · `#/admin/invites` · `#/admin/flags` · `#/admin/audit`

Marketplace: `#/login` · `#/register` · `#/account` · `#/account/seller` · `#/account/buyer` · `#/sell` मेरी बिक्री ·
`#/sell/new` बेचें · `#/market` बाज़ार · `#/market/listing/:id` · `#/orders` · `#/orders/:id` ·
`#/admin` (+ `/sellers`, `/orders`, `/reports`, `/ledger`, `/newListing`)

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

**`GET /health`** (also `/api/health`) → `{ "status": "ok" }` · **`GET /ready`** (also `/api/ready`) → `200 { status: "ok", checks: { database: "ok" } }` or `503` with the failing check.

**Phase 4:**

| Endpoint | Who | What |
| --- | --- | --- |
| `GET/POST /api/consent` | anyone (device id) | latest consent / record consent `{ deviceId, version, lang }` |
| `GET /api/account/my-data?deviceId` · `POST /api/account/my-data/delete` | the phone (+ account if logged in) | download JSON · delete (`confirm: "DELETE"`; `ACTIVE_ORDERS` 409 while orders run) |
| `GET /api/account/flags` | anyone | feature flags for this person |
| `POST /api/history/:id/feedback` | the phone | `{ deviceId, helpful, comment? }` |
| `POST /api/account/help` | anyone | `{ deviceId, category, message, callbackPhone? }` |
| `POST /api/events` | the app | only `{ name: "app_open", deviceId }` |
| `POST /api/auth/register` | anyone | now also `inviteCode` (`INVITE_REQUIRED` 403 / `INVALID_INVITE` 400) |
| `/api/admin/pilot` (+ `/export/<metric>.csv`, `/feedback-comments.csv`) · `/api/admin/invites` · `/api/admin/flags` · `/api/admin/help` · `/api/admin/audit` | coordinator | pilot dashboard, invite codes, flags, help requests, audit log |

### Marketplace API

All marketplace writes need the login cookie and the header `X-Requested-With: agriai`. Errors use the same
`{ "error": { "code" } }` shape; new codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `INVALID_LOGIN` (401),
`LOGIN_LOCKED` (429), `PHONE_TAKEN` (409), `WEAK_PIN` (400), `SELLER_PROFILE_MISSING` (403), `OUT_OF_STOCK` (409),
`INVALID_TRANSITION` (409), `CONFLICT` (409). Without MongoDB/`JWT_SECRET` all of these answer 503.

| Endpoint | Who | What |
| --- | --- | --- |
| `POST /api/auth/register` · `/login` · `/logout`, `GET /api/auth/me` | anyone | phone + PIN; `me` returns `{ user: null }` when logged out |
| `PUT /api/account/seller-profile` · `/buyer-profile` | seller · buyer | own profile |
| `POST /api/market/listings/draft` (multipart `image`, `text`) | seller, coordinator | Snap & List → `{ status: 'ok', photoId, draft }` or `{ status: 'retake', reason }` |
| `POST /api/market/photos` · `GET /api/market/photos/:id` | seller, coordinator · public | upload / show a listing photo |
| `POST /api/market/listings` · `PATCH /api/market/listings/:id` · `GET /api/market/my/listings` | seller (PATCH also coordinator) | create / edit (price, quantity, min order, pause, sold out) / mine |
| `GET /api/market/listings?category&product&q&minPrice&maxPrice&minQty&bulk&lat&lon&radiusKm&sort&page` · `GET /api/market/listings/:id` | public | browse (no phone/UPI ever) |
| `GET /api/market/pricing/suggest?product&unit` | seller, coordinator | `{ source: 'mandi' \| 'platform' \| 'ai' \| null, … }` |
| `POST /api/market/orders` · `GET /api/market/orders` · `GET /api/market/orders/:id` | buyer · participants | order (optional `offeredPricePerUnitPaise`); views include `allowedNext`, contact after acceptance, UPI link for the buyer |
| `POST /api/market/orders/:id/status` `{ to, paidVia? }` | per state machine | one step |
| `POST /api/market/orders/:id/rating` · `POST /api/market/reports` | buyer · participants | 1–5 stars once · report an order or listing |
| `GET /api/market/notifications` · `POST …/read` · `POST /api/market/push/subscribe` | logged in | in-app list (polled every 30 s) · link this phone for web push |
| `/api/admin/*` (stats, sellers, verify/reject, reports, hide/unhide, assisted listing, orders, delivery, commission, `export.csv`) | coordinator | coordinator panel |


## Switching AI provider

All AI code is behind `AiProvider` in `backend/src/services/ai/aiProvider.ts` (`diagnose()` and `chat()`):

1. Add `backend/src/services/ai/<name>Provider.ts` implementing both methods.
2. Add a `case` for it in `createAiProvider.ts` and its name to `AI_PROVIDER` in `config/env.ts`.
3. Set `AI_PROVIDER=<name>` in `.env`.

Prompts are in `services/ai/prompt.ts` (diagnosis + chat share the persona and medicine rules).
Every prompt has a version (`services/ai/promptVersions.ts`): after changing a prompt, bump its version and run
`npm run prompts:snapshot`, then `npm run eval` to compare the new report with the previous one.

## Scripts (in both `backend/` and `frontend/`)

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start in development mode       |
| `npm run build`     | Production build                |
| `npm test`          | Run tests (no API key needed)   |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript check                |

All gates for both apps in one go: `scripts/check-all.sh`. End-to-end journeys (Playwright, 360 px, fake AI, in-memory
database filled by the seed): `cd frontend && npm run e2e` (first time: `npx playwright install chromium`).
360 px screenshots of the Phase 5/6 screens: `cd frontend && npx playwright test -c playwright.screens.config.ts`.

Backend only: `npm run check-indexes` (frequent queries use an index), `npm run eval` (AI quality report),
`npm run prompts:snapshot` (after changing a prompt), `npm run loadtest` (100/500 connections, AI mocked).

Backend production: `npm run build && npm start`.

Tests mock the AI, Open-Meteo, data.gov.in and web push. Advisor tests use in-memory stores; marketplace tests run
against a throwaway in-memory MongoDB replica set (`mongodb-memory-server`, real transactions; it downloads a
MongoDB binary once into `~/.cache/mongodb-binaries`, and never touches the MongoDB on your machine). To also test the MongoDB
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
  config/marketRules.ts           marketplace rules (commission, PIN, limits, pricing bands)
  config/marketCatalog.ts         products + units;   config/marketMessages.ts  notification texts
  modules/                        marketplace, one folder per feature:
    auth/  sellers/                 accounts, PIN login, sessions, roles, seller/buyer profiles
    listings/  pricing/             Snap & List, photos, search; fair price suggestion
    orders/                         orderStateMachine.ts, order service (transactions), UPI link
    commission/  notifications/     ledger; in-app + push notifications
    reports/  admin/                problem reports; coordinator panel API
  scripts/                        createCoordinator, seed, checkIndexes, evalAi, snapshotPrompts
  observability/                  pino logger + redaction, request ids, Sentry, health/readiness
  services/storage/               PhotoStorage: database (default) or Cloudinary
  modules/audit/ privacy/ flags/  audit log; consent + my-data; feature flags
  modules/invites/ feedback/ help/ metrics/   invite codes; AI feedback; help requests; events + pilot dashboard
  eval/                           label parsing, scoring and report for the AI evaluation
  config/securityRules.ts  featureFlags.ts  metrics.ts  privacy.ts
backend/loadtest/                 autocannon load test + demo server, results/
backend/seed-assets/              drawn demo photos for the seed
backend/tests/                    API + provider + repository tests (fake AI, in-memory history)
backend/tests/market/             marketplace tests (real MongoDB replica set in memory)
frontend/src/
  pages/                          Home, Diagnose, History(+Detail), Farm(+Setup), Weather, Water, Calendar, Notifications
  pages/market/  pages/admin/     marketplace screens (login, sell, market, orders) and coordinator panel
  components/market/  admin/      listing form, Snap & List flow, cards, order actions, UPI QR, stat tiles
  strings/en.ts                   English for the buyer marketplace (Hindi/English toggle)
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
docker-compose.yml                mongo + backend + frontend (nginx), local
docker-compose.prod.yml           production on a VPS (Atlas, HTTPS); deploy/nginx-https.conf
render.yaml  DEPLOY.md            Render blueprint and the deployment guide
scripts/backup.sh  restore.sh     daily MongoDB backup with retention, restore
eval/                             photos + labels (not in git), reports, prompt versions
.github/workflows/                CI (lint, typecheck, test, build, docker) and daily backup
docs/screenshots/                 UI screenshots at 360px width
```

## Safety note

AI advice can be wrong. Every result screen tells the farmer to confirm with the nearest
Krishi Vigyan Kendra (KVK) before using any medicine.
