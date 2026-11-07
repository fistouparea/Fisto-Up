# AgriAI ko internet par chalana (Deploy guide)

Ye guide pilot (20–50 kisan, 2–3 SHG) ke liye hai. Har step ek-ek karke karein.
Jahaan `<...>` likha hai, wahaan apni value daalein.

**Production ke liye teen paid cheezein (baaki free chal sakta hai):**
- **Gemini: paid key** (billing chalu + monthly spend cap, step 4). Free tier commercial kaam ke liye nahi hai,
  aur us par Google prompts ko apne product sudharne mein use kar sakta hai.
- **Render backend: Starter plan (~$7/mahina)**. Free web service production ke liye nahi hai aur so jaata hai.
  `render.yaml` mein `agriai-api` ka `plan: free` → `plan: starter` karein (farmer app static site free hi rehti hai).
- **Atlas:** M0 (free, 512 MB, Atlas backup nahi) pilot ke liye chalta hai; hamara roz ka backup (step 10) zaroor lagayein.
  Zyada data ho to Flex (~$8/mahina).

**Kya-kya lagega:**

| Service | Kis kaam ke liye | Free tier ki seema (sach-sach) |
| --- | --- | --- |
| [Render](https://render.com) | Backend (API) + farmer app | Free backend **15 minute khaali rehne par so jaata hai**. Pehli request par jaagne mein ~1 minute lagta hai. 750 ghante/mahina. Shell aur cron job free mein nahi. |
| [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | Database | M0: **512 MB**, shared server, backup nahi milta (hamari backup script use karein). Transactions chalte hain (replica set). |
| [Cloudinary](https://cloudinary.com) | Listing ki photos | 25 credit/mahina (1 credit ≈ 1 GB storage ya 1 GB download). Pilot ke liye kaafi. |
| [Sentry](https://sentry.io) | Error pakadna (optional) | Developer plan: 5,000 errors/mahina, 1 user. |
| [GitHub](https://github.com) | Code, CI, daily backup | Private repo: 2,000 CI minute/mahina. |
| Google AI Studio | Gemini (AI) | Production mein **paid** project (prepay, kam se kam $5) + monthly spend cap. Tier 1 ki account seema $250/mahina. Hum sirf photo aur fasal ka naam bhejte hain. |

> **Sabse badi seema:** Render free backend so jaata hai. Kisan ki pehli jaanch ~1 minute le sakti hai.
> Upay: step 8 mein ek free "uptime ping" lagayein jo har 10 minute `/health` kholta rahe (750 ghante mein ek
> service poore mahine jaagti reh sakti hai). Asli launch ke baad Render ka Starter plan (~$7/mahina) lena behtar hai.

---

## Step 0: Code GitHub par daalein

```bash
cd ai_fisto_up
git remote add origin https://github.com/<aapka-username>/agriai.git
git push -u origin main
```

Repo **private** rakhein. `.env` kabhi push nahi hota (`.gitignore` mein hai). Push karne se pehle check karein:
`git ls-files | grep -i env` → sirf `.env.example` dikhna chahiye.

## Step 1: MongoDB Atlas (database)

1. https://www.mongodb.com/cloud/atlas par sign up karein → **Create** → **M0 (Free)** → provider AWS, region
   **Mumbai (ap-south-1)** → naam `agriai`.
2. **Database Access** → **Add New Database User**:
   - user `agriai-app`, lamba random password (Autogenerate) → role **Read and write to any database**.
   - Doosra user `agriai-backup`, role **Read any database** (sirf backup ke liye).
3. **Network Access** → **Add IP Address** → `0.0.0.0/0` (Render free ka IP fix nahi hota, isliye ye zaroori hai.
   Isliye password lamba aur random hona chahiye).
4. **Connect** → **Drivers** → connection string copy karein. Usmein password daalein aur `/agriai` database naam jodein:
   ```
   mongodb+srv://agriai-app:<password>@agriai.xxxxx.mongodb.net/agriai?retryWrites=true&w=majority
   ```
   Ye aapka `MONGO_URI` hai. Atlas hamesha replica set hota hai, isliye orders ke transactions chalenge.

## Step 2: Cloudinary (photos)

1. https://cloudinary.com par free sign up.
2. Dashboard → **API Keys** (ya "Product Environment Credentials") → **API environment variable** copy karein:
   `cloudinary://<api_key>:<api_secret>@<cloud_name>`. Ye `CLOUDINARY_URL` hai. Secret kisi ko na dikhayein.
3. Photos `agriai/listings` folder mein jaayengi (`CLOUDINARY_FOLDER` se badal sakte hain). Phone ko photo
   chhoti (max 1024px) aur WebP mein apne-aap milti hai.

## Step 3: Sentry (optional, errors ke liye)

1. https://sentry.io par sign up → **Create Project** do baar:
   - Platform **Node.js** → naam `agriai-backend` → DSN copy karein (`SENTRY_DSN`).
   - Platform **React** → naam `agriai-web` → DSN copy karein (`VITE_SENTRY_DSN`).
2. Settings → Security & Privacy → **Data Scrubber** chalu rakhein. Hum khud bhi phone, cookie, body nahi bhejte.

## Step 4: Gemini key (paid, kharche ki seema ke saath)

Laptop wali `.env` ki key production mein **na** lagayein. Production ke liye alag project aur nayi key:

1. https://aistudio.google.com/projects → **Create project** → naam `agriai-production`.
2. Us project ki line mein **Set up billing** → billing account chunein ya banayein → **Prepay** (kam se kam $5).
   Prepay mein jitna paisa daala, usse zyada kharcha ho hi nahi sakta.
3. https://aistudio.google.com/spend → project `agriai-production` → **Monthly spend cap → Edit spend cap**
   → jaise **$30** (pilot ka andaaza ₹1,300–2,800/mahina, showcase/SOURCES.md). Cap par pahunchne par AI ruk jaata hai
   (app "थोड़ी देर बाद कोशिश करें" dikhata hai, koi guess nahi). Billing data ~10 minute late aata hai,
   isliye thoda upar ja sakta hai.
4. https://aistudio.google.com/api-keys → **Create API key** → project `agriai-production` → key copy karein
   (sirf Render mein daalein, kahin aur nahi). Billing Tier column mein "Tier 1" / paid dikhna chahiye.
5. (Achha hai) Google Cloud console → Billing → **Budgets & alerts** → $20 par email alert (ye sirf batata hai, rokta nahi).

## Step 5: Render par deploy (Blueprint)

1. https://render.com par GitHub se sign up → **New** → **Blueprint** → apna `agriai` repo chunein.
   Render `render.yaml` padhkar do service banata hai: `agriai-api` (backend) aur `agriai-web` (farmer app).
2. Render jo values maangega, woh bharein:

   | Key | Value |
   | --- | --- |
   | `MONGO_URI` | Step 1 wala (agriai-app user) |
   | `CLOUDINARY_URL` | Step 2 wala |
   | `GEMINI_API_KEY` | Step 4 wala |
   | `CORS_ORIGIN` | `https://agriai-web.onrender.com` (custom domain ke baad woh, step 7) |
   | `SENTRY_DSN` | backend DSN (ya khaali) |
   | `VITE_SENTRY_DSN` (agriai-web par) | frontend DSN (ya khaali) |
   | `DATA_GOV_API_KEY` | mandi bhav ke liye (optional) |
   | `VAPID_*` | web push ke liye (optional, README "Web push") |

   `JWT_SECRET` Render khud random banata hai. `INVITE_ONLY=true` pilot ke liye hai (sirf invite code se khaata bane).

   **`DEMO_MODE` kabhi na jodein.** Production mein `DEMO_MODE=true` ho to server start hi nahi hota (jaanboojhkar).

   VAPID keys (web push) laptop par banayein: `cd backend && npx web-push generate-vapid-keys`.
   Public key `VAPID_PUBLIC_KEY`, private key `VAPID_PRIVATE_KEY`, aur `VAPID_SUBJECT=mailto:<aapka email>`.
   Teeno hon tabhi push chalta hai. Private key kisi ko na dikhayein.
3. **Apply** dabayein. Pehla build 5–10 minute leta hai.
4. Check karein:
   - `https://agriai-api.onrender.com/health` → `{"status":"ok"}`
   - `https://agriai-api.onrender.com/ready` → `{"status":"ok","checks":{"database":"ok"}}`
     (`down` aaye to `MONGO_URI` aur Atlas Network Access dobara dekhein)
   - `https://agriai-web.onrender.com` → app khulna chahiye.
5. **Zaroor test karein:** app mein login karke page reload karein. Login bana rehna chahiye.
   Farmer app `/api/*` ko Render ke "rewrite" se backend tak bhejta hai, taaki app aur API ek hi address par hon
   (cookie aur CSP ke liye zaroori). Agar login reload ke baad chala jaaye, to step 7 ka "Plan B" karein.

> Agar `agriai-api` naam pehle se kisi ne le liya ho, Render alag address dega (jaise `agriai-api-x1y2.onrender.com`).
> Tab `render.yaml` mein `destination: https://<naya-address>/api/*` badalkar push karein.

**Server ki settings (kyon):** `NODE_ENV=production` par server tab tak start nahi hota jab tak `CORS_ORIGIN`,
`MONGO_URI` aur `JWT_SECRET` sahi na hon. Galti hone par Render ke **Logs** mein saaf likha aata hai kya galat hai
(value kabhi nahi dikhti).

`TRUST_PROXY=2` isliye hai kyunki request pehle static site ke rewrite aur phir Render ke load balancer se aati hai.
Rate limit ko kisan ka asli IP chahiye. Agar Logs mein sabhi requests ek hi IP se dikhein, to ye number badalna padega.

## Step 6: Pehla coordinator banayein

Render free mein shell nahi milta. Isliye ye apne laptop se Atlas par chalayein:

```bash
cd backend
npm install
MONGO_URI="<step 1 wala MONGO_URI>" npm run create-coordinator -- --phone <aapka mobile> --name "<aapka naam>"
# 4 ank ka PIN poochega (dikhega nahi)
```

Phir app mein `#/login` par login karein → "संयोजक पैनल" khulega. Invite code `#/admin/invites` par banayein
(6 akshar, har kisan/SHG ke liye ek), sellers `#/admin/sellers` par verify karein. Naye features `#/admin/flags` mein
pehle sirf pilot accounts ke liye chalu hote hain (invite code se bane khaate pilot hote hain). Demo data (`npm run seed`) production mein **na chalayein**.

Indexes check (optional): `MONGO_URI="..." npm run check-indexes` → saari lines par ✓ aana chahiye.

## Step 7: Apna domain + HTTPS

Render har custom domain par free HTTPS (Let's Encrypt) apne-aap lagata hai.

1. Domain khareedein (jaise `agriai.in`). DNS settings mein:
   - `app` → **CNAME** → `agriai-web.onrender.com`
2. Render → `agriai-web` → **Settings → Custom Domains** → `app.agriai.in` jodein → "Verified" aur
   "Certificate issued" ka intezaar karein (kuch minute se 1 ghanta).
3. Render → `agriai-api` → Environment → `CORS_ORIGIN=https://app.agriai.in` → Save (service restart hogi).
4. Kisan ko sirf `https://app.agriai.in` dein. Chrome mein "Install app" / "Add to Home screen".

**Plan B (agar rewrite se login na tike):**
- DNS mein `api` → CNAME → `agriai-api.onrender.com`. Render → `agriai-api` → Custom Domains → `api.agriai.in`.
- `agriai-web` par env `VITE_API_BASE_URL=https://api.agriai.in` jodein.
- `render.yaml` mein `/api/*` wala rewrite hata dein, aur CSP ke `connect-src` mein `https://api.agriai.in` jodein.
  (`app.` aur `api.` ek hi domain ke hain, isliye SameSite=Strict cookie chalti hai.)
- Push karein → dono redeploy.

## Step 8: Jaagte rehna (free tier ke liye)

1. https://uptimerobot.com (free) ya https://cron-job.org (free) par account banayein.
2. Naya HTTP monitor: `https://agriai-api.onrender.com/health`, har **10 minute**.
3. Isse backend nahi soyega, aur down hone par aapko email aayega.
   Dhyaan: push notification ka job (subah 7 aur shaam 6 baje) server ke andar chalta hai, isliye server ka jaagna zaroori hai.

## Step 9: GitHub CI aur merge block

- Har push/PR par `.github/workflows/ci.yml` chalta hai: lint, typecheck, test, build (dono apps) aur Docker build.
- **Fail hone par merge rokna:** GitHub repo → **Settings → Rules → Rulesets → New branch ruleset** →
  target `main` → **Require a pull request before merging** aur **Require status checks to pass** →
  `backend`, `frontend`, `docker` jodein → Save.
  (Private repo par rulesets ke liye GitHub ka paid plan chahiye ho sakta hai; public repo par free hai.)

## Step 10: Roz ka backup

Atlas M0 mein backup nahi hota. Do tareeke (dono free), kam se kam ek zaroor lagayein:

**A. GitHub Actions (aasaan, laptop band ho tab bhi chalta hai)**
1. GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
   - `MONGO_URI` = `agriai-backup` user wala connection string (sirf padh sakta hai)
   - `BACKUP_PASSPHRASE` = lamba password (ise kahin surakshit likh lein; iske bina backup khul nahi sakta)
2. `.github/workflows/backup.yml` roz raat 2 baje (India) chalega. Backup encrypt hokar 14 din tak
   Actions → "Daily backup" → artifact mein rehta hai. Actions tab se "Run workflow" dabakar abhi test karein.

**B. Apne laptop/server par cron**
```bash
crontab -e
# roz raat 2 baje, 14 din purane hata do
0 2 * * * cd /path/to/ai_fisto_up && MONGO_URI="<backup user URI>" BACKUP_PASSPHRASE="<password>" BACKUP_DIR=/path/to/backups RETENTION_DAYS=14 ./scripts/backup.sh >> /path/to/backups/backup.log 2>&1
```
Script ko `mongodump` chahiye, ya Docker (tab `mongo:8.0` image apne-aap use hoti hai).

**Restore (wapas laana):**
```bash
# Pehle hamesha ek NAYE khaali database mein check karein (URI mein /agriai_restore_check):
MONGO_URI="mongodb+srv://...@.../agriai_restore_check" BACKUP_PASSPHRASE="..." ./scripts/restore.sh backups/agriai-<date>.archive.gz.gpg
# Sab theek ho to asli database mein (purana data backup se BADAL jaayega, "RESTORE" type karna padega):
MONGO_URI="<asli URI>" BACKUP_PASSPHRASE="..." ./scripts/restore.sh backups/agriai-<date>.archive.gz.gpg --drop
```
Har mahine ek baar restore test zaroor karein. Photos Cloudinary mein rehti hain, backup mein nahi.

## Apne server (VPS) par chalana ho to

Render ki jagah koi Linux server (jaise 2 GB RAM VPS) ho:

```bash
cp backend/.env.example backend/.env   # NODE_ENV=production, MONGO_URI (Atlas), JWT_SECRET, CORS_ORIGIN=https://app.agriai.in ...
# HTTPS certificate (Let's Encrypt), domain ka A record is server par hona chahiye:
sudo certbot certonly --standalone -d app.agriai.in
sudo cp /etc/letsencrypt/live/app.agriai.in/{fullchain,privkey}.pem deploy/certs/
docker compose -f docker-compose.prod.yml up -d --build
```

- nginx: gzip, `/assets` 1 saal cache, `index.html`/`sw.js` hamesha naye, saare security headers, HTTP→HTTPS.
- Containers non-root chalte hain, backend read-only filesystem par.
- Certificate renew: `certbot renew --webroot -w deploy/acme` (cron mein), phir `docker compose -f docker-compose.prod.yml restart frontend`.

## Kuch galat ho to

| Dikkat | Kya dekhein |
| --- | --- |
| Backend start nahi hota | Render → agriai-api → Logs. "Invalid environment configuration" ke neeche likha hai kaunsi value galat hai. |
| `/ready` → `database: down` | Atlas → Network Access mein `0.0.0.0/0`, `MONGO_URI` ka password (special characters URL-encode karein). |
| Photo upload fail | `CLOUDINARY_URL` sahi format mein? Logs mein `Cloudinary HTTP 401` = galat key. |
| Pehli jaanch bahut dheemi | Server so raha tha (step 8). |
| Error kahaan dekhein | Sentry → Issues. Har error mein `request_id` hai; Render Logs mein usi id ko search karein. |

## Production status

Abhi deploy nahi hua. Deploy ke baad yahan live address likhein (koi secret nahi):

**Abhi ka plan: free test-pilot** (budget nahi). Gemini free key, Render free (UptimeRobot ping ke saath), Atlas M0,
Cloudinary free. Free Gemini par Google photo/sawaal ko apni AI sudharne mein use kar sakta hai, isliye "मेरा डेटा"
aur sahmati patra mein ye likha hai. **Zyada kisano tak le jaane se pehle:** paid Gemini key (step 4) aur
`render.yaml` mein `agriai-api` ka `plan: starter`.

| Kya | Address |
| --- | --- |
| Farmer app | – |
| Backend health | – |
| Deploy ki tareekh | – |
