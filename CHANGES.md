# AgriAI – Changes (Task 1 se Task 4)

Har task ka alag git commit hai, taaki aap ek-ek karke review kar sakein:

```
git log --oneline
44ac113 Task 4: Diagnosis history (मेरी जाँच) with MongoDB, plus Docker
1353469 Task 3: Hindi voice with the browser Web Speech API
41d5197 Task 2: Follow-up chat after diagnosis (और पूछें)
a9c74b9 Task 1: Safer medicine (dawai) advice
93fa3c1 Step 1: Photo diagnosis app (baseline)
```

Kisi ek task ka diff dekhna ho to: `git show a9c74b9` (ya jo bhi commit id ho).

**Status:** backend ke 78 tests aur frontend ke 31 tests pass hain. Lint, typecheck, build aur `npm audit`
(0 vulnerabilities) dono apps mein clean hain. Docker stack bhi build karke chala kar check kiya.

---

## 1. Har task mein kya bana

### Task 1 – Dawai ki salah zyada safe
- AI prompt mein naye rules:
  - Dawai sirf chemical/generic naam se (jaise "मैंकोजेब"). Brand ya company ka naam nahi.
  - Dose sirf general tarike se (kab, kaise, kitni baar). Exact quantity nahi.
  - Har dawai ke saath "पैकेट पर लिखी मात्रा के अनुसार ही डालें।" likha ho.
  - Banned ya bahut zehreeli dawai kabhi nahi (monocrotophos, phorate, endosulfan, carbofuran wagairah).
  - AI ko pakka pata na ho to dawai nahi batayega, KVK se poochhne ko bolega.
- Backend khud bhi har dawai ke text mein "पैकेट पर लिखी मात्रा के अनुसार ही डालें।" jod deta hai, agar AI bhool jaye.
- Result screen par dawai section ke upar peela warning box: "दवाई डालने से पहले पैकेट पढ़ें और दस्ताने-मास्क पहनें।"

### Task 2 – "और पूछें" (follow-up chat)
- Result ke neeche chat box hai. Teen ready sawal ke button hain ("ये दवाई कब डालूँ?" wagairah), aur
  apna sawal type bhi kar sakte hain.
- Naya endpoint `POST /api/chat`. Isme jata hai: fasal, pehli diagnosis ka JSON, aur aakhri 10 messages.
  Photo dobara nahi bheji jaati.
- Jawab chhota (lagbhag 5 line), simple Hindi mein. Kheti se alag sawal par AI vinamrata se kehta hai ki
  wo sirf kheti mein madad karta hai.
- Wahi AI provider interface (`AiProvider.chat()`), wahi retry/429 handling, wahi rate limit, wahi error codes.
  Dawai ke safety rules chat par bhi lagte hain.

### Task 3 – Hindi awaaz (free, browser wali)
- 🎤 mic button chat box mein: Hindi mein bolo, text box mein aa jaata hai.
- 🔊 "सुनें" button result par aur har chat jawab par. Hindi voice mile to usi mein padhta hai.
  Dobara dabao to "रोकें" (band).
- Sab kuch `frontend/src/hooks/useSpeech.ts` mein hai (`useSpeechInput`, `useSpeechOutput`).
  Koi paid API nahi.
- Browser support na kare to button chupchaap chhup jaata hai. Type karna hamesha chalta hai.

### Task 4 – Jaanch ka history ("मेरी जाँच")
- Backend mein MongoDB + Mongoose. `MONGO_URI` `.env` aur `.env.example` mein hai.
- Pehli baar app khulne par phone ek anonymous `deviceId` (UUID) banata hai aur localStorage mein rakhta hai
  (try/catch ke saath).
- Har pakki (confident) jaanch save hoti hai: deviceId, fasal, AI result, createdAt. Photo kabhi save nahi hoti.
- Naye endpoints:
  - `GET /api/history?deviceId=...&page=1&limit=10`: naya pehle, pages mein.
  - `GET /api/history/:id?deviceId=...`
- Naya "📋 मेरी जाँच" tab hai. List mein tareekh aur samasya ka naam dikhta hai, aur "और देखें" se aage ke
  page aate hain. Kisi par tap karo to poora result khulta hai (सुनें aur और पूछें bhi wahan chalte hain).
- MongoDB band ho to bhi jaanch chalti hai. Bas save skip hota hai aur server log mein error likha jaata hai.
  "मेरी जाँच" page par message aata hai: "अभी पुरानी जाँच नहीं दिख रही..."
- `docker-compose.yml` mein mongo, backend aur frontend (nginx, port 8080) hain. Dono apps ab bhi plain
  `npm run dev` se chalti hain.

---

## 2. Maine khud kaun se decisions liye

1. **Git:** folder git repo nahi tha. Maine `git init` kiya aur pehle Step 1 ka "baseline" commit banaya,
   taaki har task ka diff alag dikhe. Commit aapke global git naam (lakshmijangid) se hain.
2. **Packet wali line code mein bhi:** sirf prompt par bharosa nahi kiya. Backend har dawai mein ye line
   zabardasti jodta hai.
3. **Step 1 ka ek rule badla:** pehle prompt exact dose maangta tha ("15 लीटर पानी में 30 मिली"). Ab aapke
   kehne par sirf general dose maangta hai.
4. **Warning box sirf tab** dikhta hai jab koi dawai batayi gayi ho. "दवाई की ज़रूरत नहीं" wale result par
   warning ka matlab nahi banta.
5. **Chat ki limits:** sawal max 500 akshar, history max 10 messages. Server dono check karta hai.
   Diagnosis AI ko "sirf data" bata kar bheji jaati hai, taaki koi usme chhupa command na chala sake.
6. **Ek hi rate limit:** diagnose aur chat dono milkar ek IP se 30 request/minute.
7. **Mic ka text pehle box mein:** bola hua text khud send nahi hota. Galat suna ho to kisan dekh kar
   theek kar sake, phir "पूछें" dabaye.
8. **Mic sirf HTTPS par:** browser http par mic allow nahi karta, isliye wahan mic button chhupa rahta hai.
   "सुनें" http par bhi chalta hai.
9. **Lambi baat tukdon mein:** kuch Chrome versions lagbhag 15 second baad bolna rok dete hain, isliye result
   vaakya-vaakya karke bola jaata hai.
10. **MONGO_URI optional:** na ho to history band rehti hai, baaki app normal chalta hai.
11. **Sirf pakki jaanch save:** "फोटो साफ नहीं है" wale result save nahi hote.
12. **Privacy:** ek jaanch kholne ke liye bhi `deviceId` chahiye. Doosre phone ka id ho to 404 aata hai,
    taaki koi id guess karke kisi aur ki jaanch na dekh sake.
13. **Routing bina library ke:** `#/`, `#/history` aur `#/history/<id>`. Phone ka back button sahi chalta hai.
    Koi naya package nahi laga.
14. **UUID http par bhi:** `crypto.randomUUID` sirf HTTPS par milta hai, isliye UUID `getRandomValues` se
    banaya. Wi-Fi wali http testing mein bhi chalta hai.
15. **TRUST_PROXY (naya env):** Docker mein nginx ke peeche sab request ek hi IP se dikhti. Tab sab kisan ek
    hi rate limit share karte. Compose `TRUST_PROXY=1` set karta hai. Iska test bhi likha hai.
16. **"नई जाँच" tab ka bug fix:** result screen par yahi tab dabane se kuch nahi hota tha. Ab nayi jaanch
    shuru hoti hai.
17. **Docker:**
    - Frontend nginx se port 8080 par chalta hai.
    - Mongo ka port bahar nahi khulta.
    - Build `node:22-slim` par hota hai, kyunki lockfile glibc wale Linux par bana hai.
18. **Tests:**
    - Backend tests fake AI aur in-memory history use karte hain.
    - Asli MongoDB wala test sirf `MONGO_URI_TEST` set hone par chalta hai. Wo apna throwaway
      `agriai_test_*` database banata hai aur baad mein delete karta hai. Ye test aapke local Mongo par
      chala kar pass kiya.
    - Aapke `FistoUp`, `DM-platform` aur `sportDB` databases ko haath nahi lagaya.
19. **React hooks ke alag tests nahi likhe:** iske liye jsdom aur testing-library jaise naye packages chahiye
    the. Unki jagah poora flow headless Chrome mein chala kar check kiya:
    - jaanch → chat → सुनें/रोकें
    - speech support hata kar buttons ka chhupna
    - history list, detail aur back button
    - doosre phone par khaali history
20. **package-lock.json dobara banaya (backend):** `npm install mongoose` ne npm ke ek known bug ki wajah se
    Linux ki native binding hata di thi. Maine node_modules aur lockfile hata kar fresh install kiya.
    Ab lockfile mein sirf mongoose ka add-on hai.

---

## 3. Kya bacha hai / kya check nahi ho paaya

- **Asli Gemini se test nahi hua:** mere paas API key nahi thi, isliye naye dawai rules aur chat prompt
  asli model par nahi chale. Saare tests fake AI se hain. **Sabse pehle yahi check karein** (neeche steps).
- **Awaaz asli phone par test nahi hui:** headless Chrome mein na mic hai na Hindi voice. Logic fake speech
  se check kiya. Phone mein Hindi voice na ho to "सुनें" English voice mein ajeeb padh sakta hai. Android par
  Settings → Text-to-speech mein "Google" engine aur Hindi language daal dein.
- **Chrome ka mic Google ko audio bhejta hai:** ye free hai, par awaaz phone ke andar process nahi hoti.
  Privacy policy mein likhna padega.
- **Banned dawai ki list sirf prompt mein hai.** Code mein Hindi naam match karke block nahi kiya, kyunki AI
  naam alag-alag spelling mein likhta hai. Aage chahein to verified list ke saath code-level check jod
  sakte hain.
- **History sirf deviceId se judi hai:** phone ka browser data clear hua to history chali jaayegi. Login
  aane par ise user account se jodna hoga.
- MongoDB band ho to har "मेरी जाँच" request ka error server log mein poore detail ke saath aata hai.
  Thoda zyada log hai, par nuksaan nahi.

---

## 4. Phone par test kaise karein (step by step)

### Taiyari (ek baar)
1. `backend/.env` banayein: `cp backend/.env.example backend/.env`. Usme `GEMINI_API_KEY` daalein.
2. **Tareeka A, npm se:** aapka local MongoDB chal raha hai, default `MONGO_URI` se `agriai` naam ka naya
   database ban jaayega.
   - `cd backend && npm install && npm run dev`
   - Doosre terminal mein: `cd frontend && npm install && npm run dev`
   - Phone par wo **Network** URL kholein jo Vite dikhata hai. Aapka Churu project 5173 par chal raha ho to
     ye 5174 hoga, jaise `http://192.168.x.x:5174`.
3. **Tareeka B, Docker se:** `docker compose up --build`, phir phone par `http://<laptop-ip>:8080`.
4. Phone aur laptop ek hi Wi-Fi par hon. Page na khule to `sudo ufw allow 5174/tcp` (ya `8080/tcp`).
5. **Mic aur "Install app" ke liye HTTPS chahiye:**
   - `cd frontend && npm run build && npm run preview`
   - Doosre terminal mein: `cloudflared tunnel --url http://localhost:4173`
   - Docker wale tareeke mein `http://localhost:8080` ko tunnel karein.
   - Jo `https://....trycloudflare.com` link mile, wo phone par kholein.

### Task 1 – Dawai safety
1. Kisi beemar patte ki paas se photo lein → "जाँच करें".
2. Dekhein:
   - Dawai ka naam chemical naam ho, koi brand nahi.
   - Har dawai ke neeche "पैकेट पर लिखी मात्रा के अनुसार ही डालें।" ho.
   - Exact gram/ml na ho.
3. Dawai section ke upar peela box ho: "दवाई डालने से पहले पैकेट पढ़ें और दस्ताने-मास्क पहनें।"
4. Swasth (healthy) patte ki photo lein: dawai mein "अभी किसी दवाई की ज़रूरत नहीं है।" aaye aur warning
   box na dikhe.

### Task 2 – और पूछें
1. Result ke neeche "💬 और पूछें" tak scroll karein.
2. "ये दवाई कब डालूँ?" button dabayein. 5 line ke andar Hindi jawab aaye.
3. Agla sawal type karein, jaise "कितनी बार डालूँ?". Jawab pichhli baat yaad rakh kar aaye.
4. Kheti se alag sawal poochhein, jaise "क्रिकेट मैच कौन जीता?". Jawab aaye ki app sirf kheti mein madad
   karta hai.
5. Wi-Fi band karke sawal bhejein: "इंटरनेट नहीं चल रहा..." aaye aur sawal box mein bacha rahe.

### Task 3 – Awaaz
1. Result par "🔊 सुनें" dabayein. Poora result Hindi mein bola jaaye. "⏹️ रोकें" se band ho.
2. Chat ke kisi jawab ke neeche "सुनें" dabayein. Sirf wahi jawab bola jaaye.
3. HTTPS (cloudflared) link par 🎤 dabayein, mic ki permission dein, Hindi mein sawal bolein. Text box mein
   aa jaaye, phir "पूछें" dabayein.
4. Plain http link par 🎤 button nahi dikhega. Ye sahi hai, type karna chalta rahega.

### Task 4 – मेरी जाँच
1. 2–3 alag fasalon ki jaanch karein.
2. Upar "📋 मेरी जाँच" tab dabayein. Sabse nayi jaanch sabse upar ho, tareekh aur samasya ke naam ke saath.
3. Kisi par tap karein: poora result khule. Phone ka back button list par wapas laaye.
4. Doosre browser ya incognito mein kholein: "अभी तक कोई जाँच नहीं हुई..." dikhe, kyunki wo naya device hai.
5. MongoDB band karke dekhein (npm wale tareeke mein `sudo systemctl stop mongod`, Docker mein
   `docker compose stop mongo`):
   - Nayi jaanch phir bhi chale.
   - "मेरी जाँच" par "अभी पुरानी जाँच नहीं दिख रही..." aaye.
   - Mongo wapas chalu karein: lagbhag 15 second mein backend khud reconnect ho jaata hai.

### Laptop par automatic tests
```bash
cd backend && npm test          # 78 tests (+1 Mongo test jo MONGO_URI_TEST se chalta hai)
cd frontend && npm test         # 31 tests
cd backend && MONGO_URI_TEST=mongodb://localhost:27017 npm test   # asli Mongo test bhi
```

---

# UI Redesign

Commits (ek-ek karke review kar sakte hain):

```
2a4f57c Add optional diagnosis severity (healthy/mild/serious) for the result badge
8f37385 UI redesign: design system (tokens + ui components) and all screens
7f4bc2b UI redesign: layout fixes from screenshot review + screenshots
```

**Screenshots:** `docs/screenshots/` mein 360px width par 14 screens hain. Sab mock data se bani hain:
home, crop chuni hui, photo preview, loading, result (स्वस्थ / ध्यान दें / गंभीर), poora result, chat,
history, khaali history, error, unclear photo aur history detail.

**Status:** backend ke 84 tests aur frontend ke 31 tests pass hain. Lint, typecheck, build aur
`npm audit` (0 vulnerabilities) dono apps mein clean hain.

## ⚠️ Pehle ye padhein: backend mein ek chhota badlav
Aapne kaha tha backend logic na badlein. Par result screen par **हरा/पीला/लाल severity badge** chahiye tha,
aur backend severity deta hi nahi tha. Frontend mein andaaza lagata (jaise "dawai hai to peela") to kisan ko
galat rang dikh sakta tha. Ye kisi aur jaanch ko galat "swasth" dikhane jaisa khatra hai.
- Isliye AI ab ek extra field deta hai: `severity` = `healthy` | `mild` | `serious`.
- Prompt mein likha hai: shak ho to zyada gambhir wala level chuno.
- Ye **sirf jodna (additive) aur optional** hai. Purani history aur bina severity wale result pehle jaise chalte
  hain; tab badge bas nahi dikhta.
- Kuch aur nahi badla. Ye alag commit (`2a4f57c`) mein hai, nahi chahiye to sirf use revert kar dein.
  Frontend bina severity ke bhi chalta hai.

## Har screen par kya badla

| Screen | Pehle | Ab |
| --- | --- | --- |
| Upar ki patti | Hara header + tabs | Patli brand bar (logo + naam). Navigation neeche chali gayi |
| Neeche navigation | – | **Bottom bar**: 📷 नई जाँच, 🕘 मेरी जाँच. Active tab peeli pill mein |
| Kadam | – | **3-step indicator**: फसल चुनें → फोटो लें → जवाब (icon + number + ✓) |
| Home | Emoji wale crop buttons | **Original SVG crop chitra** (9 fasal), bade card, chuni hui par ✓. Fasal chunte hi neeche **bada peela "फोटो लें" button** aur "गैलरी" button aate hain (sticky, hamesha angoothe ki pahunch mein) |
| Photo preview | Photo + 2 bade button | Photo + sticky **"जाँच करें"** (peela, hero) + "फिर से" |
| Loading | Ghoomta circle | **Patte par magnifier ki animation** + "जाँच हो रही है..." + 🔊 |
| Result | Ek ke baad ek box | Sabse upar **bada severity badge** (हरा ✓ स्वस्थ / पीला ⚠ ध्यान दें / लाल ⛔ गंभीर, 🔊 ke saath). Phir "पूरा सुनें". Phir cards: समस्या, कारण, देसी उपाय, दवाई, सावधानी, har ek ka apna icon aur 🔊. Dawai warning aur KVK line alag highlighted box mein |
| Chat | Text box + chhota mic | **Bada gol mic button** main input, text box uske neeche. Kisan ka bubble daayein (hara), AI ka baayein (halka hara + 🌱 + 🔊). Jawab aate waqt "typing" dots |
| Meri jaanch | Simple list | Card: fasal chitra, samasya, fasal naam, tareekh, **severity badge**, ›. Load hote waqt skeleton |
| Khaali / error / unclear | Peela box | **Bada icon gola + ek line + 🔊 + ek saaf button** |
| Messages | Inline text | **react-hot-toast** (icon ke saath): "जाँच पूरी हुई", chat error, "आवाज़ नहीं आई" |

Har zaroori heading aur instruction ke paas 🔊 button hai (purana `useSpeech` hook hi use hua).

## Naye libraries (sab chhote, jaane-maane)
- `react-icons` (sirf Lucide set `react-icons/lu`). Sirf use hue 37 icons bundle mein jaate hain.
- `react-hot-toast`: toasts.
- `framer-motion`: halki animation (page badalna, result aana, button dabana). `LazyMotion` se, aur
  animation engine pehli screen ke baad load hota hai.
- `clsx` + `tailwind-merge`: `cn()` helper (`src/utils/cn.ts`).
- `@fontsource/mukta`: Google Fonts ka **Mukta** font, apne server se (neeche dekhein).

## Maine khud kaun se decisions liye
1. **Severity backend se** (upar dekhein).
2. **Design tokens:** Tailwind v4 mein config CSS mein (`@theme`) hota hai, isliye saare tokens
   `src/index.css` mein hain: primary, accent, success, warning, danger (shades ke saath), surface, ink, line.
   Components mein koi hex rang nahi hai. Saare text-background jode WCAG AA paas karte hain (kam se kam
   5.4:1, zyadatar 7:1 se upar). Light theme default hai.
3. **Base font 18px:** saare size (buttons, spacing) thode bade ho gaye. Sabse chhota button 56px+ ka hai.
4. **Font apne server se:** Mukta (Google Fonts) ko `@fontsource` se bundle kiya. Google ko request nahi jaati,
   aur PWA offline bhi font dikhata hai. Sirf 2 weight (400, 700) aur sirf Devanagari + Latin hain.
   `font-display: swap` ki wajah se text turant system font mein dikhta hai. Font pehli baar use par cache
   hota hai (precache nahi kiya, warna slow net par do baar download hota).
5. **Emoji ki jagah SVG fasal chitra:** purane sasti Android phones mein 🫛 🫘 jaise naye emoji dabba (☐)
   dikhte hain. Isliye 9 simple original SVG banaye (`CropIcon.tsx`), sirf token rangon se.
6. **Camera button fasal chunne ke baad:** pehle bada button hamesha dikhta tha aur neeche ke crop cards
   chhup jaate the. Ab fasal chunte hi camera button neeche se aata hai. Isse farmer ko agla kadam bhi
   samajh aata hai.
7. **Toast ya poori screen:**
   - Chhote ya beech ke messages toast mein dikhte hain: jaanch poori, chat fail, mic ne nahi suna,
     "aur dekhein" fail.
   - Jo error aage badhne se rokte hain (jaanch fail, history load fail), wo poori screen par icon + line +
     button ke saath dikhte hain.
   - Ek hi baat do jagah na dikhe, isliye dono saath nahi aate.
8. **Error ke rang:** "बहुत लोग जाँच करवा रहे हैं", internet band aur timeout jaise thodi der ke error
   **peele** (ध्यान दें) hain. Asli kharabi **laal** hai. Rang ka matlab sab jagah ek jaisa hai.
9. **Result par badi photo nahi:** photo ab fasal wali patti mein chhoti thumbnail hai, taaki severity badge
   pehli screen par hi dikhe.
10. **Animation halki:** sirf opacity/slide/scale, 0.2 second ke aas-paas. Phone mein "reduce motion" on ho to
    band ho jaati hai (framer-motion `reducedMotion="user"` + CSS).
11. **Bundle size:** pehli load JS 73 KB se 115 KB (gzip) hui. 18 KB animation engine baad mein load hota
    hai. Pehli visit ke baad service worker sab cache kar leta hai.
12. **Top tabs hata kar bottom bar:** angoothe se pahunchna aasaan. "नई जाँच" dabane par hamesha nayi jaanch
    shuru hoti hai (pehle wala fix bana hua hai).

## Kya check nahi ho paaya
- Asli phone par dhoop mein test nahi hua. Contrast numbers se check kiya, aankh se screenshots mein.
- Severity asli Gemini se test nahi hui (key nahi thi). Mock data se teeno rang check kiye.
- Desktop par layout beech mein max-width wala hai, par screenshots sirf 360px ke liye.

## Phone par kaise dekhein
Pehle jaise hi chalayein (upar "Phone par test kaise karein" dekhein). Phir dekhein:
1. **Home:** koi fasal tap karein. ✓ lage aur neeche bada peela "फोटो लें" button aaye.
2. **Kadam:** upar step indicator 1 → 2 → 3 badle.
3. **Severity:**
   - Swasth patte ki photo: **hara "स्वस्थ"**.
   - Halki beemari: **peela "ध्यान दें"**.
   - Badi beemari: **laal "गंभीर"**.
4. **Awaaz:** har card ke 🔊 se sirf wahi card bole. "पूरा सुनें" se poora result.
5. **Chat:** mic button bada aur beech mein ho, bubbles alag rang ke hon.
6. **Meri jaanch:** cards par severity badge ho. Wi-Fi band karke kholein: peela error + "फिर से कोशिश करें".
7. Phone ki settings mein "Remove animations" on karein: app bina animation ke chale.

---

# Phase 2

Har task ka alag commit hai (`git show <id>` se ek-ek dekh sakte hain):

```
513adcf Task 1: मेरा खेत (farm profile) with skippable onboarding
4d872c1 Task 2: Weather (मौसम) with rule-based crop alerts
1beb972 Task 3: Water guidance (पानी की सलाह), rule-based
f72b83a Task 4: Crop calendar, follow-ups, notifications and web push
3caa75a Task 5: Home dashboard + alerts never contradict water advice
972eb6b Fix: screens could get stuck with 'reduce motion' on
5d19a34 Task 6: Mandi bhav (optional, data.gov.in Agmarknet)
0be9bfe Task 7: Offline support
3464a88 Fix: backend refused to start with empty optional values in .env
a3929b2 Docs: README, .env.example, screenshots
```

**Status:**
- Backend ke 186 tests aur frontend ke 66 tests pass hain.
- Lint aur typecheck dono apps mein clean hain.
- Asli MongoDB wale tests bhi pass hue. Ye sirf throwaway `agriai_test_*` databases use karte hain; aapke
  `FistoUp`, `DM-platform`, `sportDB` ko haath nahi lagaya.
- Screenshots: `docs/screenshots/p2-*` (17 screens, 360px).

## 1. Har task mein kya bana

### Task 1 – मेरा खेत
- **Onboarding:** pehli baar app khulne par 3 screens aate hain, har ek "छोड़ें" se skip ho sakta hai:
  1. **Jagah:** "मेरी जगह लें" (GPS) ya Churu ki tehsil list se chunein.
  2. **Fasal:** crop picture cards aur buvai ki tareekh ("1 हफ्ता", "1 महीना"... chips, ya date picker).
  3. **Khet:** size बीघा mein (+/− aur chips) aur paani ka source (ट्यूबवेल, नहर, बारिश पर निर्भर, टांका/कुंड).
- **Save:** MongoDB mein deviceId ke saath (`FarmProfile`). GPS ~1 km tak round karke save hota hai (privacy).
- **"मेरा खेत" tab** se baad mein dekh aur badal sakte hain.
- **Tehsil list:** `frontend/src/data/locations.ts` mein hai. Naya zila ya tehsil wahin jodein.

### Task 2 – मौसम
- Open-Meteo (free, bina key) se aaj + 7 din ka mausam. Backend 1 ghante cache karta hai, 8 second timeout.
  Service band ho to pichhli copy deta hai.
- **Mausam screen:** bada icon, tapmaan, baarish %, hawa, aur 7 din ki list.
- **Alerts:** लू, पाला, भारी बारिश, तेज़ हवा/आँधी, लंबा सूखा. Rang se khatra: peela = ध्यान दें, laal = गंभीर.
  Har alert ke saath fasal aur stage ke hisaab se simple Hindi salah aati hai.
- **Saare numbers aur texts** `backend/src/config/agroRules.ts` mein hain, "VERIFY WITH KVK" mark ke saath.

### Task 3 – पानी की सलाह
- Har fasal ka card: "आज पानी दें" / "आज पानी न दें" / "2 दिन बाद दें" / "मिट्टी देखें", ek line ki wajah ke saath.
- **Faisla in cheezon se hota hai:** fasal, stage, retili mitti, paani ka source, baarish ka forecast, garmi aur et0.
  Saare rules `agroRules.ts` mein hain, AI ka andaaza nahi.
- **"आज पानी दिया" button:** isse aakhri sinchai yaad rehti hai, aur agli salah sahi hoti hai.
- Paani bachane ke tips (shaam ko sinchai, palwar, drip, fawwara, halki sinchai) aur hamesha ye line:
  "यह सामान्य सलाह है, अपने खेत की नमी भी देखें।"

### Task 4 – फसल कैलेंडर, follow-up, सूचनाएँ, push
- **Fasal calendar:** har fasal ki timeline बुवाई → अंकुरण → बढ़वार → फूल → दाना/फली → कटाई. Abhi wali stage
  highlight hoti hai, aur "आज का काम" ki list hoti hai. Data `backend/src/data/cropCalendar.ts` mein hai.
- **Follow-up:** gambhir ya "ध्यान दें" wali jaanch ke 3 din baad "क्या फसल ठीक हुई?" aata hai, 3 bade
  buttons ke saath (ठीक हुई / वैसी ही / और खराब). "और खराब" nayi photo jaanch kholta hai aur KVK ki salah deta hai.
- **सूचनाएँ screen:** upar bell icon aur nayi suchnaon ki ginti. Kya padh liya, ye phone par yaad rehta hai.
- **Web push (optional):** VAPID keys `.env` mein daalne par chalu hota hai.
  - Din mein 2 baar (subah 7, shaam 6 baje) check hota hai, aur ek phone ko ek baar mein max 2 sandesh jaate hain.
  - Ek hi sandesh dobara nahi aata.
  - Permission tabhi maangi jaati hai jab kisan ek baar app use kar chuka ho, Hindi explanation ke saath.

### Task 5 – होम dashboard
- Upar "राम राम सा 🙏" + aaj ki tareekh + jagah. Phir zyada se zyada 5 card, zaroori pehle:
  mausam → alert → follow-up → आज का काम → पानी → मंडी भाव.
- Sabse neeche bada "फोटो से जाँच" button. Har card par 🔊 hai.
- Neeche ke tabs ab hain: होम, जाँच, मेरी जाँच, मेरा खेत.
- Khet ki jaankari adhuri ho to dashboard par "जानकारी भरें" card aata hai.

### Task 6 – मंडी भाव (optional)
- data.gov.in (Agmarknet) se kisan ki fasalon ke aaj ke bhav: Churu, Sardarshahar, Ratangarh, Sujangarh,
  Taranagar, Rajgarh mandi. ₹ प्रति क्विंटल aur data ki tareekh dikhti hai.
- Key na ho ya API fail ho to card chupchaap chhup jaata hai.

### Task 7 – Offline
- **App bina internet ke khulta hai** (service worker). Pichhla mausam, paani ki salah, calendar, dashboard,
  सूचनाएँ, मेरा खेत, मेरी जाँच ki list aur kholi hui jaanch dikhti hain.
- **Banner:** "इंटरनेट नहीं है, पुरानी जानकारी दिख रही है" + "आखिरी अपडेट" ka samay.
- **Photo jaanch:** offline hone par saaf likha aata hai ki iske liye internet chahiye.
- Production build ko asli offline reload karke check kiya.

## 2. Maine khud kaun se decisions liye
1. **Ek "farm snapshot":** mausam, alert, stage, paani, follow-up aur suchnaayein ek hi jagah
   (`farmSnapshot.ts`) se banti hain. Dashboard, alag-alag screens aur push job sab yahi use karte hain, isliye
   rules ek hi jagah rehte hain.
2. **Dashboard ek request mein:** slow internet ke liye 4 ki jagah 1 request. Mandi alag request mein hai,
   taaki slow mandi API baaki home ko na roke.
3. **Paani ki salah conservative hai:** baarish aane wali ho, haal mein baarish hui ho, kataai ho, ya stage mein
   paani nuksaan karta ho (jaise chane mein phool), to "न दें". Aakhri sinchai pata na ho to "मिट्टी देखें",
   kabhi andaaze se "पानी दें" nahi.
4. **Bahut zaroori: salah aapas mein nahi takraati.**
   - Screenshot dekhte waqt maine pakda ki garmi ka alert "सिंचाई करें" bol raha tha, jabki usi screen par
     paani card "चना: आज पानी न दें" bol raha tha.
   - Ab alert ki sinchai wali lines alag list mein hain. Jis fasal ko abhi paani nahi dena, uske liye alert
     mein saaf "चना में अभी सिंचाई न करें।" aata hai.
   - Calendar ka "फूल के समय पानी की कमी न होने दें" bhi chane ke liye galat tha, wo bhi theek kiya.
   - Dono ke liye tests hain.
5. **Read/unread phone par:** suchnaon ki stable id hoti hai (jaise `alert:frost:2026-11-12`). Server bas yaad
   rakhta hai ki kaun si push bhej di, isliye naya database table nahi bana.
6. **Follow-up ka answer:** purani jaanch ke record mein ek naya field `followUp` joda hai. Purana data waise
   hi chalta hai. Swasth (healthy) jaanch ka follow-up nahi poochha jaata, aur 21 din se purani ka bhi nahi.
7. **Route badla:** home ab dashboard hai (`#/`), aur photo jaanch `#/check` par hai. Isliye purane route test
   ki expectation badli. Ye jaan-boojhkar kiya, koi test kamzor nahi kiya.
8. **GPS sirf HTTPS par chalta hai:** http (Wi-Fi testing) par "मेरी जगह लें" button nahi dikhta, tehsil list
   hamesha hai. GPS ke baad sabse paas ki tehsil ka naam dikhta hai.
9. **Mandi:** free API poore Rajasthan ka data deti hai. Hum apni taraf se paas ki mandi aur fasal chhaant'te
   hain (keywords `data/mandis.ts` mein).
10. **Bug jo maine pakde aur theek kiye:**
    - Phone mein "reduce motion" on ho to screen atak jaati thi (onboarding nahi khulta tha).
    - `.env.example` copy karke backend start nahi hota tha (khaali values ki wajah se).
    - Har fix ka alag commit hai.
11. **npm bug:** do baar npm ne `npm install` ke baad rolldown ki native file hata di. Dono baar `node_modules`
    aur lockfile hata kar fresh install kiya (tareeka `CLAUDE.md` mein likha hai).

## 3. Kya nahi hua / kya test nahi ho paaya
- **Agro rules ka expert check nahi hua:** saare numbers (garmi 42°C, pala 4°C, sinchai ke din, stage ke din,
  kaam) maine aam jaankari se rakhe hain. **KVK se check karwana zaroori hai**, file:
  `backend/src/config/agroRules.ts` aur `backend/src/data/cropCalendar.ts`.
- **Push asli phone par test nahi hui:** code, job aur subscription tests se check kiye, par asli Google/Chrome
  push service tak sandesh nahi bheja. Iske liye VAPID keys + HTTPS + production build chahiye (neeche steps).
- **Mandi asli data par test nahi hui:** data.gov.in key nahi thi. Mandi ke naam (spelling) asli data se
  milaane padenge.
- **GPS asli phone par test nahi hua.**
- **Ek chhota edge case:** garmi alert mein "फूल के समय गर्मी से फूल झड़ सकते हैं" sab fasalon par aata hai.
  Rabi mein Churu mein 42°C se upar phool ke samay bahut kam hota hai.
- **Login abhi nahi hai:** browser data clear karne par history aur khet ki jaankari us phone se chali jaati hai.
  Login (Phase 3) mein theek hoga.

## 4. Phone par test kaise karein

**Taiyari:**
- `cp backend/.env.example backend/.env`, phir `GEMINI_API_KEY` bharein. MongoDB chalu rakhein (ya
  `docker compose up --build`).
- Wi-Fi par `http://<laptop-ip>:5173` (npm) ya `:8080` (Docker) kholein.
- GPS, push aur "Install app" ke liye HTTPS chahiye:
  ```bash
  cd frontend && npm run build && npm run preview
  cloudflared tunnel --url http://localhost:4173
  ```
  Jo `https://` link mile, wo phone par kholein.

**Task 1 – मेरा खेत**
1. Pehli baar kholte hi "अपने खेत के बारे में बताएँ" aaye.
2. Tehsil chunein (HTTPS par "मेरी जगह लें" bhi try karein) → आगे.
3. Fasal chunein → "1 महीना" chip → आगे.
4. "5 बीघा" + "ट्यूबवेल" → सेव करें.
5. "मेरा खेत" tab mein sab sahi dikhe. "बदलें" se badal kar dekhein.
6. Naye browser/incognito mein teeno "छोड़ें" dabayein: home par "जानकारी भरें" card aaye.

**Task 2 – मौसम**
1. Home ka mausam card dabayein: aaj ka mausam aur 7 din ki list dikhe.
2. Garmi/thand/baarish/aandhi ka asli alert mausam par nirbhar hai. Rules ki jaanch ke liye
   `cd backend && npm test` (har alert ka test hai).
3. Wi-Fi band karke kholein: pichhla mausam + offline banner.

**Task 3 – पानी**
1. Home ka "पानी की सलाह" → "पूरा देखें".
2. Gehun par "मिट्टी देखें" aaye (aakhri sinchai pata nahi). "आज पानी दिया" dabayein: "आज पानी न दें"
   ho jaana chahiye.
3. Chana 2 mahine purana ho to phool ki stage mein "आज पानी न दें" aaye.

**Task 4 – कैलेंडर, follow-up, सूचनाएँ, push**
1. Home ka "आज का काम" → "पूरा देखें": timeline mein abhi wali stage peeli dikhe.
2. Ek photo jaanch karein. Follow-up 3 din baad aata hai (healthy ke liye nahi). Jaldi dekhna ho to `npm test`
   ka follow-up test dekhein.
3. Upar bell dabayein: सूचनाएँ list, "नई" tag, "सब पढ़ लिया" se ginti 0 ho jaaye.
4. **Push:**
   - `cd backend && npx web-push generate-vapid-keys`, keys `.env` mein daalein, backend restart karein.
   - HTTPS link par app use karein, phir bell screen par "हाँ, सूचना भेजें" dabayein.
   - Subah 7 ya shaam 6 baje (India time) sandesh aayega.

**Task 5 – होम**
1. Home par upar se: राम राम सा → mausam → alert (ho to) → follow-up (ho to) → आज का काम → पानी → मंडी.
   Zyada se zyada 5 card.
2. Har card ka 🔊 dabakar sunein. Neeche "फोटो से जाँच" se jaanch khule.

**Task 6 – मंडी**
1. https://data.gov.in par free account banakar API key lein, `.env` mein `DATA_GOV_API_KEY` daalein,
   backend restart karein.
2. Home par "मंडी भाव" card aaye. Key hata dein to card gayab ho jaaye (koi error nahi).

**Task 7 – Offline**
1. Ek baar internet ke saath home, mausam, calendar aur meri jaanch kholein.
2. Phone ka data/Wi-Fi band karke app band karein aur dobara kholein. App khule, upar peela
   "इंटरनेट नहीं है, पुरानी जानकारी दिख रही है" + aakhri update ka samay dikhe.
3. "जाँच" tab: "फोटो से जाँच के लिए इंटरनेट चाहिए" likha aaye.
4. Internet wapas aate hi banner chala jaaye.

---

# Phase 3 – Marketplace

Har task ka alag commit hai (`git show <id>` se ek-ek dekh sakte hain):

```
1b74bc5 Task 1: Accounts and roles (phone + PIN login)
a3ae605 Task 2: Snap & List for sellers
9ff2fc4 Task 3: Fair price suggestion
01e9ce7 Task 4: Buyer marketplace
d34e003 Task 5: Orders with a tested state machine
714c99d Task 6: Coordinator dashboard
6da65a3 Seed script + per-account limits on orders and reports
35e45c8 Screenshots + fixes found while reviewing them
```

**Status:**
- Backend ke 361 tests aur frontend ke 109 tests pass hain. Lint aur typecheck dono apps mein clean hain.
- `npm audit`: dono apps mein 0 vulnerabilities.
- Marketplace ke tests asli MongoDB par chalte hain (memory mein ek alag replica set, har test file ka apna
  `agriai_test_*` database). Aapke `FistoUp`, `DM-platform`, `sportDB` ya `agriai` ko haath nahi lagaya.
- Screenshots: `docs/screenshots/p3-*` (47 screens: 360px + 3 desktop).
- **Docker mein poora check kiya:**
  - Alag project naam aur port par `docker compose up --build`. MongoDB replica set apne-aap bana (healthy).
  - Container ke andar seed aur create-coordinator chalaye.
  - nginx ke through order स्वीकार kiya (transaction chala) aur photos khulin.
  - Check ke baad woh containers, volume aur images hata diye. Aapka `mongo-data` volume nahi chhua.

## 1. Har task mein kya bana

### Task 1 – Khaate aur roles
- **3 roles:** विक्रेता (seller), खरीदार (buyer), संयोजक (coordinator). Advisor (फोटो जाँच, खेत, मौसम…) bina
  login ke pehle jaisa chalta hai.
- **Login:** mobile number + 4 अंक ka PIN.
  - PIN bcrypt se hash hota hai. 1234, 1111 jaise aasaan PIN mana hain.
  - 5 baar galat PIN par khaata 15 minute band. IP par bhi rate limit hai.
  - Galat number aur galat PIN par ek hi message aata hai.
- **Session:** JWT, httpOnly cookie mein (SameSite=Strict, production mein Secure). Logout karne par us khaate ke
  saare sessions band ho jaate hain.
- **CSRF:** har likhne wali request par `X-Requested-With: agriai` header zaroori hai.
- **OTP baad mein:** login `CredentialMethod` interface ke peeche hai, OTP isi mein jud jaayega.
- **Device link:** pehli baar login karne par is phone ki खेत की जानकारी aur मेरी जाँच khaate se jud jaati hai.
  Doosre phone par login karne par wahi data dikhta hai.
- **Seller profile:** naam, gaanv, SHG (agar hai), UPI ID, saamaan uthane ki jagah (tehsil + nishaani).
  - Naya seller "जाँच बाकी" (pending) rehta hai, aur coordinator ke verify karne tak uska saamaan bazaar mein nahi dikhta.
  - Verify ke baad UPI ID badalne par seller phir se pending ho jaata hai, kyunki paise isi ID par aate hain.
- **Phone number kabhi public nahi:** sirf order मंज़ूर hone ke baad buyer aur seller ko ek-doosre ka number milta hai.
- **Coordinator sirf script se banta hai** (app mein sign-up nahi): `npm run create-coordinator` (README dekhein).

### Task 2 – बेचें (Snap & List)
- Bada "बेचें" button (home aur मेरी बिक्री par) → फोटो → बोलें ya लिखें → AI jaankari bharta hai.
- **AI ko sirf photo aur seller ki baat jaati hai.** Phone number apne-aap hata diya jaata hai.
- **AI ka JSON zod se check hota hai:** saamaan, matra, unit, bhav, quality, title aur jaankari (hindi + english).
  "ढाई क्विंटल" jaise aadhe numbers 250 किलो ban jaate hain (bhav bhi prati kilo).
- **AI photo bhi jaanchta hai:** photo mein saamaan na dikhe to "दूसरी फोटो लें" aata hai, aur woh photo save nahi hoti.
- **Pakka karne ki screen:** bade cards (saamaan, matra, bhav, thok minimum), har card par 🔊. Ek bada
  "पक्का करें, बेचें" button.
- **AI fail ho to bhi listing nahi rukti:** photo alag se save hoti hai aur seller form khud bharta hai.
- **SHG khane ke saamaan** ke liye FSSAI number ka field (optional, 14 अंक).
- **मेरी बिक्री:** listings ke saath भाव बदलें, मात्रा बदलें, रोकें / फिर चालू करें, बिक गया. Upar नए ऑर्डर bhi
  dikhte hain.
- **Photos MongoDB mein** save hoti hain (koi paid storage nahi). Bina use hui photos 24 ghante mein apne-aap mit jaati hain.

### Task 3 – सही भाव का सुझाव
- **Fasal:** Phase 2 wali Agmarknet mandi service. Dikhta hai "मंडी भाव: ₹X – ₹Y प्रति क्विंटल (तारीख)" aur
  सही भाव ka range (median ±5%). Kilo mein bechne par prati kilo bhav.
- **SHG saamaan:** platform par milte-julte kam se kam 3 listings ka median (±15%). Na hon to AI ka andaaza.
  AI ko sirf saamaan ka naam aur unit jaata hai. Kam bharose wala jawab chhupa diya jaata hai, aur jawab 1 din cache hota hai.
- **Saaf likha hai** "यह सिर्फ़ सुझाव है। भाव आप खुद तय करें।" Ek "सुझाया भाव भरें" button bhi hai.
  Bhav bahut kam ya zyada ho (jaise ek zero chhoot gaya) to halki chetavni aati hai, par listing kabhi rukti nahi.
- **Data na ho to sujhav chhup jaata hai.**

### Task 4 – खरीदार का बाज़ार
- Saaf shopping UI, mobile par 2 column, desktop par 3–4 column. **हिंदी / English toggle**
  (`strings/en.ts`), jo khareedar ki order screens par bhi chalta hai.
- **Filters:** category chips, saamaan chips, search (hindi/english), bhav range, kam se kam uplabdh matra,
  सिर्फ़ थोक (B2B), tehsil/GPS se doori (25/50/100 km), sasta/mehnga/naya pehle. Filters wapas aane par yaad rehte hain.
- **Bina login bhi browse** ho sakta hai. Sirf verified seller ka chalu, bina chhupa aur stock wala saamaan dikhta hai.
- **Listing page:** photos (swipe), bhav, uplabdh matra, kam se kam order, quality, FSSAI, seller ka gaanv,
  सत्यापित badge, rating aur WhatsApp share (wa.me link).
- **B2B:** seller kam se kam order matra rakhta hai. Khareedar "कम भाव पूछें" se apna bhav bhejta hai, aur seller
  स्वीकार ya मना karta hai.

### Task 5 – ऑर्डर
- **State machine ek hi jagah:** `backend/src/modules/orders/orderStateMachine.ts`. Har step ke liye likha hai
  ki kaun kar sakta hai aur uska asar kya hai:
  `requested → accepted/rejected → ready → out_for_delivery / ready_for_pickup → delivered → paid → completed`,
  aur `cancelled`.
- **Stock atomic:** स्वीकार karte hi MongoDB transaction ke andar shart wala atomic update stock ghatata hai.
  - Do log ek saath aakhri bori accept karein to sirf ek safal hota hai (test hai).
  - Order cancel karne par stock wapas aata hai.
  - Stock 0 hone par listing "बिक गया" ho jaati hai.
- **Seller ko naya order** do tarah se dikhta hai:
  - App mein, kisi bhi screen par: popup + awaaz mein padhkar + bade "स्वीकार करें / मना करें" buttons.
  - Web push se (agar chalu hai).
- **Bhugtan:** khareedar ko UPI deep link (`upi://pay` – seller ka UPI ID, naam, rakam, order number) aur QR milta hai.
  Seller ek tap mein "पैसे मिल गए" (UPI ya नकद) dabata hai. Naqad (delivery par) bhi allowed hai.
- **Saara paisa integer paise mein.** Order poora hone par commission ledger mein ek line banti hai
  (rate config se, half-up rounding). Ek order par do baar commission ho hi nahi sakta (unique index).
- **Har badlaav par suchna:** khareedar, seller aur saare coordinators ko in-app (har 30 second check) +
  web push (agar VAPID keys hain). Jisne step liya, use nahi jaati.
- **Order poora hone ke baad** khareedar 1–5 star rating aur comment de sakta hai. "समस्या बताएँ" button order
  aur listing dono par hai.
- **docker-compose ka MongoDB ab single-node replica set hai** (transactions ke liye).

### Task 6 – संयोजक पैनल (`#/admin`)
- Desktop par chauda, phone par bhi chalta hai. Tabs: सारांश, विक्रेता, ऑर्डर, शिकायतें, कमीशन, मदद से लिस्टिंग.
- **विक्रेता:** filter/search, सत्यापित करें, नामंज़ूर karein (kaaran seller ko dikhta hai). Jo app nahi chala
  sakte, unka khaata coordinator khud bana sakta hai (seedha verified).
- **शिकायतें:** flagged listing aur order ki samasya. Listing chhupa sakte hain aur phir dikha sakte hain,
  aur shikayat band kar sakte hain.
- **ऑर्डर board:** status ke hisaab se groups. Seller ki taraf se har step le sakte hain, aur delivery wale ka
  naam + phone tay kar sakte hain (khareedar aur seller ko dikhta hai).
- **मदद से लिस्टिंग:** seller chunein, sahmati ka tareeka (बोलकर / अंगूठा / हस्ताक्षर) + note likhein, phir wahi
  Snap & List. Sahmati listing ke saath save hoti hai.
- **कमीशन:**
  - Mahine ke totals aur har seller ka baaki.
  - "वसूल किया" button transaction mein chalta hai, isliye do baar dabane par paisa do baar nahi gina jaata.
  - CSV download (Excel ke liye, Hindi naam sahi dikhte hain, formula injection se safe).
- **सारांश:** sellers, buyers, listings, orders, kul bikri, commission (baaki/vasool), khuli shikayatein, commission dar.
- Har `/api/admin` route server par coordinator role check karta hai (test hai).

### Quality
- Naya code `backend/src/modules/{auth,sellers,listings,pricing,orders,commission,notifications,reports,admin}`
  mein hai. Business rules `config/marketRules.ts`, `config/marketCatalog.ts` aur `config/marketMessages.ts` mein hain.
- Har input zod se check hota hai. Har protected route par role aur malik (ownership) check hota hai. Code mein koi secret nahi.
- **Seed:** `npm run seed`. Isse demo coordinator, 5 sellers (1 pending), 2 buyers, 12 listings (banayi hui photos)
  aur har state ke orders bante hain. Saare demo PIN 2580 hain (README mein list hai).

## 2. Maine khud kaun se decisions liye
1. **Marketplace tabhi chalu hota hai jab `MONGO_URI` aur `JWT_SECRET` dono hon.** Warna marketplace ke routes
   503 dete hain aur advisor pehle jaisa chalta hai.
2. **Ek khaata = ek role.** Seller ko kharidna ho to alag number se buyer khaata banaye.
3. **Naye packages** (har ek ki wajah):
   - `bcryptjs`: pure JS, Docker slim image mein native build ki dikkat nahi.
   - `jose`: JWT, bina dependency ke.
   - `cookie-parser`.
   - `mongodb-memory-server`: sirf dev. Transactions asli MongoDB par test karne ke liye, kyunki mock se stock
     reservation ka test bekaar hota.
   - `qrcode`: frontend UPI QR.
4. **Price request = order with offer:** alag system banane ki jagah order mein `offeredPricePerUnitPaise` hai.
   Seller स्वीकार / मना karta hai, aur state machine wahi rehti hai.
   - Sirf thok listings (min order > 1) par.
   - Bhav listed se kam aur kam se kam 50% hona chahiye.
5. **Matra poore numbers mein** (10 क्विंटल, 250 किलो). Aadha quintal kilo mein badal jaata hai. Isse paise ka
   hisaab hamesha integer rehta hai.
6. **"paid → completed" khareedar karta hai** ("ऑर्डर पूरा करें"), aur jawab na de to coordinator.
   Commission completion par banta hai.
7. **Logout se us khaate ke saare sessions band** hote hain (tokenVersion). Isse churaya gaya cookie bhi bekaar ho jaata hai.
8. **Photos MongoDB mein** (max 3, phone par chhoti aur bina GPS ki hoti hain).
9. **Suchnaayein polling se (har 30 s).** WebSocket nahi, kyunki slow network par polling sasta aur bharosemand hai.
   App band ho to web push.
10. **Limits:** ek khaata ghante mein max 30 order aur 10 shikayat kar sakta hai (spam se bachne ke liye, config mein).
11. **Screenshot review mein mile bug (theek kiye):**
    - **Doosre phone par login** ke baad app wapas login screen par atak jaata tha. Ab sahi screen khulti hai, aur
      login hote hue login screen kholne par "आप लॉगिन हैं" aata hai.
    - Price field 360px par card se bahar ja raha tha.
    - Chips ka text toot raha tha.
    - Pickup order mein jagah khaali dikh rahi thi.
    - Admin tab phone par dikh nahi raha tha.
12. **Seed script mein bug pakda:** "ek commission vasool" wala step galti se asli (non-demo) line badal sakta
    tha. Ab sirf demo seller ki line badalti hai.

## 3. Kya nahi hua / kya test nahi ho paaya
- **OTP nahi hai:** koi bhi kisi bhi number se khaata bana sakta hai. Isliye seller verification zaroori hai.
  OTP ke liye interface taiyaar hai, par free SMS service nahi mili (paid SMS mana tha).
- **PIN bhool gaye:** abhi app mein reset nahi hai. Coordinator naya khaata bana sakta hai, par PIN reset ka
  button nahi hai.
- **Asli Gemini se Snap & List test nahi kiya:** saare tests aur screenshots mein AI ka jawab mock tha. Asli
  photo + awaaz se ek baar zaroor check karein (prompt `services/ai/marketPrompt.ts` mein hai).
- **Mandi bhav asli key se test nahi hua.** Screenshot mein mandi sujhav mock tha.
- **UPI link asli UPI app (GPay/PhonePe) mein nahi khola.** Format NPCI ke hisaab se hai aur test bhi hai, par asli
  phone par ₹1 bhejkar check karein.
- **Web push asli phone par nahi gaya** (Phase 2 jaisa). In-app suchnaayein test hui hain.
- **Mic (awaaz se likhna)** headless browser mein nahi chalta, isliye screenshot mein mic button nahi dikhta.
  Phone par HTTPS ke saath check karein.
- **Bazaar offline nahi chalta:** sirf मेरी बिक्री aur मेरे ऑर्डर ki aakhri copy offline dikhti hai. Bazaar ke liye
  internet chahiye (saaf message aata hai).
- **Order screens ka English** sirf khareedar ke liye hai. Seller aur coordinator screens Hindi mein hain.
- **Delivery wale ka apna app/login nahi hai.** Coordinator uska naam aur phone daalta hai.
- **Demo photos asli nahi hain,** banayi hui illustrations hain.

## 4. Phone par test kaise karein

**Taiyari:**
1. `backend/.env` mein `JWT_SECRET` daalein (`openssl rand -hex 32`). Phir `docker compose up --build`
   (MongoDB replica set apne-aap ban jaata hai).
   - npm se chalana ho to README ka "MongoDB replica set" dekhein.
   - Wi-Fi par plain http se test karne ke liye `COOKIE_SECURE=false` rakhein.
2. Demo data: `docker compose exec backend node dist/scripts/seed.js` (ya `cd backend && npm run seed`).
   Saare demo PIN **2580** hain.
3. Apna coordinator: `docker compose exec backend node dist/scripts/createCoordinator.js --phone <aapka number> --name "<naam>"`.
4. Phone par `http://<laptop-ip>:8080` kholein. Mic aur push ke liye Cloudflare HTTPS tunnel use karein (Phase 2 jaisa).

**Seller (बेचने वाला)**
1. "खाता" icon → नया खाता बनाएँ → "बेचना है" → naam, number, PIN do baar.
2. Vikreta ki jaankari bharein: gaanv, UPI ID, tehsil → सेव करें. Upar peela "जाँच बाकी" dikhe.
3. "बेचें" → फोटो लें → 🎤 dabakar bolein "मेरे पास दस क्विंटल बाजरा है, पच्चीस सौ रुपये क्विंटल" → आगे.
4. Cards mein बाजरा, 10 क्विंटल, ₹2500 bhare hone chahiye. Mandi key ho to "मंडी भाव" box dikhe. 🔊 dabakar sunein.
5. "पक्का करें, बेचें" → "संयोजक की जाँच के बाद दिखेगा". मेरी बिक्री mein listing dikhe.
6. Kisi kitaab ya chehre ki photo lein: "दूसरी फोटो लें" aana chahiye.
7. Demo seller 9000000102 / 2580 se login karein: "नया ऑर्डर आया!" popup aaye aur awaaz mein padha jaaye.
   "स्वीकार करें" dabayein.
8. Order screen par: माल तैयार है → उठाने के लिए तैयार. Khareedar ke "सामान मिल गया" ke baad "पैसे मिल गए" → UPI.

**Khareedar (खरीदने वाला)**
1. नीचे "बाज़ार" tab: bina login ke saamaan dikhe. English button dabayein: sab English mein ho jaaye.
2. फ़िल्टर → "सिर्फ़ थोक (B2B)" + "सस्ता पहले" → दिखाएँ. Search mein "अचार" ya "pickle" likhein.
3. Koi listing kholein → "WhatsApp पर भेजें". Link dabane par wahi listing khule.
4. "ऑर्डर करें": login maangega. Demo 9000000201 / 2580 (hotel). Matra, डिलीवरी / खुद उठाएँगे, UPI / नकद → ऑर्डर भेजें.
5. Thok listing (साफ़ देसी बाजरा) par "कम भाव पूछें" mein ₹2350 bhejein.
6. Seller ke accept karne ke baad order screen par seller ka number, "UPI ऐप से भेजें" button aur QR dikhe.
   Phone par button UPI app kholna chahiye (sahi naam, rakam aur AG… number ke saath).
7. "सामान मिल गया" → (seller "पैसे मिल गए") → "ऑर्डर पूरा करें" → stars dekar rating bhejein.
8. "समस्या बताएँ" → "माल खराब है" → भेजें.

**Coordinator (संयोजक)**
1. 9000000001 / 2580 se login karein: seedha "संयोजक पैनल" khule.
2. विक्रेता → "जाँच बाकी" → गीता कंवर → सत्यापित करें. Uski दरी ab bazaar mein dikhe.
3. नया विक्रेता जोड़ें: kisi bina smartphone wali didi ka khaata banayein, aur unhe PIN bata dein.
4. शिकायतें → shikayat padhein → listing chhupayein (bazaar se gayab ho) → phir dikhayein → शिकायत बंद करें.
5. ऑर्डर → "जवाब बाकी" order ko seller ki taraf se स्वीकार karein. Delivery order par "डिलीवरी वाला तय करें".
6. मदद से लिस्टिंग → रमेश जाट → "अंगूठा लगाया" → आगे → photo + bolkar listing banayein.
7. कमीशन → mahine ka total → kisi seller par "वसूल किया" (rakam confirm ho). "CSV डाउनलोड करें" ko Excel mein
   kholein: Hindi naam sahi dikhein.
8. Laptop par bhi `#/admin` kholkar dekhein (chauda layout).

## 5. Seller test ke baad fixes (24 अक्टूबर)

Aapne seller banke check kiya to do problem aayi. Dono ki asli wajah dhoondhkar theek kiya:

**1. AI apne-aap jaankari nahi bhar raha tha**
- **Wajah:** hamara code nahi tha. Google ka `gemini-3.8-flash` model us waqt overloaded tha ("This model is
  currently experiencing high demand", HTTP 503). Ek shabd ka sawaal bhi fail ho raha tha ya 45 second mein
  timeout ho raha tha. Isliye app "खुद भर दें" wala form dikha raha tha.
- **Fix:** naya setting `GEMINI_FALLBACK_MODELS` (aapke `.env` mein `gemini-3.5-flash,gemini-3.1-flash-lite`
  daal diya hai). Main model busy ho, timeout ho, ya galat JSON de, to agla model apne-aap try hota hai. Isse photo
  jaanch aur chat ko bhi fayda hai.
- `GEMINI_ATTEMPT_TIMEOUT_SECONDS=25` bhi daala hai: busy model par 45 second ki jagah 25 second ke baad
  fallback chalta hai.
- **Aapke setup par check kiya:** asli AI ke saath bajra (10 क्विंटल, ₹2500) aur achar (20 किलो, ₹150) sahi bhare gaye.
- Agar 3.8-flash baar-baar busy rahe to `GEMINI_MODEL=gemini-3.5-flash` rakh sakte hain. Test mein usne ~3 second
  mein sahi jawab diya.

**2. Product add nahi ho raha tha**
- **Wajah:** aapka local MongoDB (`localhost:27017`) replica set nahi hai, aur listing save karne mein transaction
  use hota tha, jo replica set ke bina fail hota hai.
- **Fix:** listing save karne ke liye ab transaction ki zaroorat nahi:
  - Photo atomic tareeke se listing se judti hai.
  - Kuch fail ho to photo wapas chhoot jaati hai, aur aadha-adhoora save nahi hota.
  - Bina replica set wale MongoDB par iska test bhi hai.
- **Order accept ke liye abhi bhi replica set chahiye** (stock sahi rakhne ke liye; ye zaroori hai).
  - Bina replica set ke ab saaf error aata hai: `NEEDS_REPLICA_SET`, aur app mein Hindi message.
  - Server log mein bhi likha aata hai ki kya karna hai.

**3. Ek aur sudhaar:** AI kabhi photo par galat shak kar sakta hai ("दूसरी फोटो लें").
- Ab us screen par "फिर भी यही फोटो रखें" button bhi hai.
- Seller ki boli hui matra aur bhav form mein pehle se bhare aate hain. Seller kabhi atakta nahi.

**Meri galti jo maine pakdi:** Task 6 ke commit mein ek test file mein lint error tha. Mere lint check output ki
sirf aakhri line dekh rahe the, isliye woh chhup gaya. Ab theek hai, aur ab main exit code se check karta hoon.

**4. Aapke computer par order chalane ke liye (aapke kehne par kiya):**
- AgriAI ke liye alag MongoDB (replica set) Docker mein chalu kiya:
  - container `agriai-mongo`, port `127.0.0.1:27018`, volume `agriai-mongo-data`
  - computer restart par apne-aap chalta hai
- Purana `agriai` data (khaate, khet, photos) 27017 se sirf padhkar copy kiya. Dono jagah ginti same hai.
  `FistoUp`, `DM-platform`, `sportDB` ko haath nahi lagaya.
- `backend/.env` mein `MONGO_URI=mongodb://localhost:27018/agriai?directConnection=true` (purani line comment mein hai).
- **Check kiya:** order स्वीकार → stock 10 se 6, poora order → commission ₹300 (3%).
- Wapas purane par jaana ho to `.env` ki purani line wapas kar dein. Container band karna ho to `docker stop agriai-mongo`.

# Phase 4 – Production + Pilot

(Ye section har task ke saath bhar raha hai. Poora saaransh, manual steps aur pilot checklist sabse neeche hai.)

## Task 1 – Security hardening

**Kya bana:**
- **helmet + CSP:** API par sabse sakht CSP (`default-src 'none'`, `frame-ancestors 'none'`), kyunki API sirf JSON,
  CSV aur photo deta hai. Farmer app (nginx) ka apna CSP `frontend/nginx/security-headers.conf` mein hai:
  sirf hamari scripts (koi inline script ya eval nahi), photos sirf API/Cloudinary/phone preview se, aur
  Sentry ke liye connect. Saath mein `X-Frame-Options`, `Permissions-Policy` (camera/mic/GPS sirf hamari site) wagairah.
- **CORS:** sirf `CORS_ORIGIN` wale origin. Har entry ek saaf origin honi chahiye (`https://app.example.com`, bina
  path ke, `*` mana). Production mein `CORS_ORIGIN` dena zaroori hai.
- **Cookie:** pehle se httpOnly + SameSite=Strict + production mein Secure tha. Wahi rakha.
- **Request size:** har route ki apni JSON limit pehle se thi (4–32 KB), photo 5 MB. Test joda.
- **Rate limits (`config/securityRules.ts`):** per IP: saari API 300/min, likhne wali requests 120/min, AI 30/min.
  Login/registration aur per-account order/report limit pehle se the. PIN lockout (5 galat → 15 min) pehle se tha.
- **Env check:** `NODE_ENV` sirf `development/production/test`. Production mein `CORS_ORIGIN`, `MONGO_URI`,
  `JWT_SECRET` zaroori. Galat config par server saaf message (value nahi) dikhakar band ho jaata hai.
- **Audit log** (`modules/audit/`, collection `audit_log`): coordinator ka har kaam (seller banaya/verify/reject,
  listing chhupayi/dikhayi/badli, assisted listing, report band, order step, delivery wala, commission vasool,
  CSV export) — kisne, kya, kab, kis record par. Phone number aur PIN kabhi nahi. Model update/delete mana karta hai
  (append-only). `GET /api/admin/audit` (sirf coordinator).
- **Access control tests:** `tests/market/accessControl.api.test.ts` har protected route par check karta hai:
  guest → 401, galat role → 403. Saath mein: buyer doosre buyer ka order na dekh sake na badal sake, seller doosre
  seller ka order/listing nahi, notifications sirf apne, public listing mein phone/UPI kabhi nahi, koi khud
  coordinator nahi ban sakta.

**npm audit:** backend 0. Frontend mein 2 (fast-uri moderate, serialize-javascript low; dono sirf build tools mein)
→ `npm audit fix` se theek, ab 0.

**Secret scan:** poori git history (`git log --all -p`) mein Gemini key, private key, Mongo password wala URI,
JWT/VAPID secret, AWS/GitHub token ke patterns dhoondhe. **Kuch nahi mila.** `backend/.env` kabhi commit nahi hua
(`.gitignore` mein hai). Aapke computer ki `backend/.env` mein asli keys hain; production ke liye **nayi keys**
banayein (local wali dobara use na karein).

**Decisions:**
- Rate limit memory mein hai (ek backend instance ke liye sahi). 2+ instance chalane ho to Redis store chahiye (DEPLOY.md).
- Audit likhna fail ho to coordinator ka kaam undo nahi hota; error log hota hai (Sentry tak jaata hai).
- Seller ka apna edit ya buyer ka order audit mein nahi jaata (woh coordinator ka kaam nahi). Order ki apni `history` pehle se hai.
- Purane test `marketConfig.test.ts` mein production config ke saath `CORS_ORIGIN` joda (naya niyam); test kamzor nahi kiya.

## Task 2 – Reliability aur observability

**Kya bana:**
- **pino logging** (`backend/src/observability/`): har log ek JSON line hai, jismein `reqId` hota hai. Har request ko
  ek id milti hai (`X-Request-Id` header; nginx/Render se aayi sahi id rakhi jaati hai). Log mein sirf method, path
  (bina query), status aur samay jaata hai. Headers, body aur query kabhi nahi.
  - PIN, token, phone, photo wale fields `[redacted]` ho jaate hain. Error message ke andar ka phone number (jaise
    MongoDB duplicate error) aur Mongo URI ka password bhi mask hota hai. Test hai.
  - Development mein pino-pretty se padhne layak lines, production mein JSON. `LOG_LEVEL` se level badlein.
- **Sentry (optional):** backend `SENTRY_DSN`, frontend `VITE_SENTRY_DSN`. Bina DSN ke kuch nahi bheja jaata.
  - Sirf error, stack, method + path aur request id jaata hai. User, cookie, header, body, query nahi, aur phone mask hota hai.
  - Frontend mein Sentry ka code alag file mein hai. Sirf DSN hone par, app khulne ke baad load hota hai
    (sasta phone pehli screen ke liye iska boj nahi uthata).
- **Error boundary:** poori app aur har screen ke liye. Crash par Hindi screen dikhti hai: "कुछ गड़बड़ हो गई।
  आपकी जानकारी सुरक्षित है।", 🔊 button, "फिर से खोलें" aur "होम पर जाएँ". Screen badalne par apne-aap theek ho jaata hai,
  aur neeche ka menu chalta rehta hai.
- **Health:** `GET /health` (process zinda hai) aur `GET /ready` (MongoDB 2 second mein ping ka jawab de, aur server
  band nahi ho raha). `/api/health` aur `/api/ready` bhi hain (nginx ke through). In par rate limit nahi lagta.
- **Graceful shutdown:** SIGTERM par pehle `/ready` 503 deta hai, phir nayi requests band hoti hain, chalu requests
  poori hoti hain, push job rukta hai, MongoDB aur Sentry band hote hain. 10 second mein na ho to zabardasti band.
  Uncaught error par bhi log + shutdown.
- **Timeouts + retry:**
  - AI: pehle se tha (har attempt timeout, 429/503 par retry, fallback models).
  - Mausam aur mandi: naya `fetchWithRetry` (`utils/http.ts`). Network error, 429 ya 5xx par ek retry hota hai.
    Timeout par retry nahi hota (dheemi service ka do guna intezaar phone par bekaar hai).
  - Web push: 429/5xx par ek retry. Server par request timeout 120 s, headers 30 s.
- **Indexes:** orders (buyer/seller + updatedAt), listings (seller + createdAt, product + unit), notifications
  (unread count), commission (seller + status, completedAt).
  - `src/db/queryPlans.ts` mein 18 sabse aam queries hain. Test check karta hai ki koi bhi poora collection scan
    nahi karti (COLLSCAN).
  - `npm run check-indexes` asli database par yahi check karta hai.
- **Slow queries:** 300 ms se dheemi har MongoDB command `slow database query` warning ke saath log hoti hai
  (command, collection, samay; filter ki values nahi).

**Decisions:**
- `services/ai/retry.ts` ko `utils/retry.ts` mein le gaya, kyunki ab mausam, mandi aur push bhi use karte hain.
- Do purane test `console.warn/error` par spy karte the. Ab logging pino se hoti hai, isliye wahi assertion logger
  par hai (test kamzor nahi hua, bas log ka raasta badla).
- Naye packages: `pino`, `pino-http` (JSON logging, request id), `pino-pretty` (sirf dev), `@sentry/node`,
  `@sentry/react` (error tracking). Sab jaane-maane aur free.
- Purane single-field indexes (orders.buyerId wagairah) compound index se badle. Pehle se chal rahe database mein
  purane index bhi rahenge, jo nuksaan nahi karte.

## Task 3 – Production deployment setup

**Kya bana:**
- **Dockerfiles (multi-stage, non-root):**
  - Backend: build stage mein TypeScript compile hota hai. Runtime = khaali Alpine + sirf `node` binary +
    production packages (npm/yarn bhi nahi). User `node` (uid 1000), `HEALTHCHECK` `/health` par.
    Size: 375 MB khula / **74 MB download** (pehle 419 MB; zyada hissa node binary aur Sentry ka hai).
  - Frontend: `nginx-unprivileged` (uid 101, port 8080). **21 MB download.**
- **nginx** (`frontend/nginx/`): gzip, `/assets` 1 saal immutable cache, `index.html`/`sw.js`/manifest hamesha
  naye (`no-cache`), saare security headers har location mein, `X-Request-Id` backend ko jaata hai.
  `deploy/nginx-https.conf`: HTTP→HTTPS redirect, TLS 1.2/1.3, HSTS, Let's Encrypt renewal path.
- **`docker-compose.prod.yml`:** Atlas ke saath (local Mongo sirf `--profile local-db` se), backend read-only
  filesystem, `cap_drop: ALL`, `no-new-privileges`, log rotation, port 80/443.
- **Photo storage provider** (`services/storage/`): `PhotoStorage` interface.
  - `database` (default; dev, tests): photo MongoDB mein, pehle jaisa.
  - `cloudinary` (production): Cloudinary REST API, signed request, koi SDK nahi. Phone ko photo
    `f_auto,q_auto,w_1024` (WebP, chhoti) CDN se milti hai. `GET /api/market/photos/:id` 302 redirect deta hai,
    isliye purane order/listing links waise hi chalte hain. Purani database wali photos bhi dikhti rehti hain.
  - Bina use hui photos ab ek **hourly job** (`jobs/photoCleanup.ts`) hatata hai: pehle Cloudinary se, phir record.
    Delete fail ho to record rehta hai aur agli baar dobara koshish hoti hai. Purana TTL index hata diya (woh sirf
    record mitata tha, Cloudinary ki file nahi).
- **Atlas-ready:** `MONGO_URI=mongodb+srv://...` chalta hai (TLS, retryable writes, replica set → transactions).
  `appName` set hai. Production mein database storage ho to log mein chetavni (Atlas M0 sirf 512 MB).
- **GitHub Actions** (`.github/workflows/ci.yml`): har push/PR par dono apps ka lint, typecheck, test, build,
  `npm audit --audit-level=high`, aur Docker images build + non-root check. Merge rokne ka tareeka DEPLOY.md step 9.
- **Backup** (`scripts/backup.sh`, `scripts/restore.sh`): mongodump (ya Docker), gzip, gpg encryption (passphrase ho to),
  retention (default 14 din). Restore bina `--drop` ke safe hai; `--drop` par "RESTORE" type karna padta hai.
  `.github/workflows/backup.yml`: roz 2 baje encrypted backup GitHub artifact mein (14 din).
- **`render.yaml`** (Blueprint) + **`DEPLOY.md`** (Hinglish, step by step).

**Maine kya check kiya:**
- Ek throwaway MongoDB container par: backup → encrypt → ek document mitaya → restore → document wapas aaya.
- `docker compose` (alag project naam, port 18080) se poora stack: `/api/ready` ok, CSP + headers, gzip, asset cache,
  nginx ki request id backend log mein, SIGTERM par "shutdown complete". Baad mein containers aur volume hata diye.
- Galat production config par container saaf message dekar band hota hai (value nahi dikhti).

**Decisions:**
- Render par farmer app **static site** hai (free, CDN, kabhi soti nahi) aur `/api/*` ko backend tak **rewrite**
  karti hai. Isse app aur API ek address par rehte hain: login cookie (SameSite=Strict) chalti hai aur CSP `'self'` kaafi hai.
  Render ke docs mein rewrite se POST/cookie ka vyavhaar saaf likha nahi hai, isliye DEPLOY.md mein test aur
  "Plan B" (`api.` subdomain + `VITE_API_BASE_URL`) diya hai. **Ye asli Render par test nahi hua** (account nahi hai).
- `TRUST_PROXY=2` Render ke liye (rewrite + load balancer). Asli Render par logs mein IP dekhkar pakka karein.
- Local "storage" = MongoDB (koi naya folder/volume nahi), kyunki ye tests aur Docker mein bina setup chalta hai.
- Backup scripts archive ko stdout/stdin se bhejti hain (Docker mein folder share karne ki permission dikkat nahi).
- Startup par index banana "slow query" mein nahi gina jaata.

## Task 4 – Privacy aur consent (DPDP Act basics)

**Kya bana:**
- **Pehli baar khulne par sahmati screen** (`ConsentPage`): saral Hindi mein 5 cheezein, har ek ke saath "kyon":
  फसल की फोटो, खेत की जानकारी, जाँच का रिकॉर्ड, बाज़ार का खाता, ऐप का इस्तेमाल. Ek bada 🔊 button poori screen
  padhkar sunata hai. "मैं सहमत हूँ" ke baad hi onboarding/app khulta hai. Neeche "पूरी नीति पढ़ें" aur "नियम और शर्तें".
  - Sahmati server par record hoti hai (`POST /api/consent`: version + samay + bhasha, collection `consents`).
    Internet na ho to phone yaad rakhta hai aur agli baar bhej deta hai.
  - Text badle to `CONSENT_VERSION` badlein (`backend/src/config/privacy.ts` + `frontend/src/api/privacy.ts`):
    sabse dobara poocha jaayega.
- **Privacy Policy aur Terms** (`#/privacy`, `#/terms`): Hindi + English toggle, upar peela
  **"DRAFT – needs legal review"**. Text `strings/hi.ts` (`legalHi`) aur `strings/en.ts` (`legalEn`) mein.
- **मेरा डेटा** (`#/my-data`, मेरा खेत aur खाता screen se link):
  - **Download:** `GET /api/account/my-data?deviceId=` ek JSON file deta hai: khet, saari jaanchein, sahmati, aur
    login ho to khaata, listings, orders, reports, notifications. PIN hash, session ya doosron ke phone kabhi nahi.
  - **Delete:** do baar poochkar `POST /api/account/my-data/delete` (`confirm: "DELETE"`).
    - Phone ka sab mit jaata hai: khet, jaanchein, sahmati, push.
    - Khaata ho to naam, phone, UPI, gaanv, pickup, listing ki photos (Cloudinary se bhi) aur notifications mit jaate hain.
      Listings bazaar se hat jaati hain.
    - **Orders mitte nahi, anonymize hote hain:** naam "हटाया गया खाता", gaanv, pata, note aur rating comment hat jaate
      hain. Rakam, ref aur commission hisaab ke liye rehte hain.
    - Phone number khaali ho jaata hai, isliye wahi number dobara register ho sakta hai. Purana PIN/session kaam nahi karta.
    - Chal rahe orders hon to `ACTIVE_ORDERS` (409): pehle poora/radd karein (seller intezaar kar raha hota hai).
    - Coordinator khaata app se nahi mitta (admin karega).
    - `deletion_log` mein sirf "kab, kis tarah ka" likha jaata hai, kiska nahi.
    - Phone par bhi `agriai.*` saara local data saaf hota hai aur nayi anonymous id se shuru hota hai.
- **AI ko personal data nahi:** pehle se test hai (diagnose sirf `image, mimeType, cropName`; chat bina image/device id;
  Snap & List mein phone number hata diye jaate hain).

**Decisions:**
- "Account deletion request" ko **turant deletion** banaya (koi manual queue nahi): pilot mein coordinator par kaam nahi
  badhta aur DPDP ka "bina deri" poora hota hai.
- Account ka record (khaali) rehta hai, kyunki orders aur commission ledger use point karte hain. Usmein ab koi personal
  jaankari nahi.
- Sahmati ke bina app nahi chalti, kyunki bina data ke salah nahi di ja sakti (screen par saaf likha hai). Ye legal review mein dekhein.
- `मेरा डेटा` ko marketplace ka setup chahiye (MongoDB + JWT_SECRET), kyunki session wahi padhta hai. Production mein dono zaroori hain.

## Task 5 – Pilot mode aur feedback

**Kya bana:**
- **Feature flags** (`backend/src/config/featureFlags.ts`): har flag ki 3 haalat: `off` (kisi ke liye nahi),
  `pilot` (sirf coordinator aur pilot khaate), `all` (sabke liye, bina khaate wale kisan bhi).
  - Default config mein, coordinator संयोजक पैनल → **सुविधाएँ** se badal sakta hai (MongoDB mein save + audit log).
    Server 15 second tak cache rakhta hai. Database na ho to defaults chalte hain (advisor kabhi nahi rukta).
  - Flags: `inviteOnly`, `aiFeedback`, `helpRequests`, `voiceInput`, `pilotDashboard`.
  - App `GET /api/account/flags` se apne flags leta hai (login/logout ke baad dobara). Offline par defaults.
- **Invite code se sign-up:** संयोजक पैनल → **इनवाइट कोड**.
  - 6 akshar ka code (0/O, 1/I/L nahi). Ek insaan ya poore SHG ke liye (kitni baar chalega: 1–200).
  - Sirf seller/buyer ke liye bhi bana sakte hain, din ki seema, band karna, aur WhatsApp par bhejna.
  - `inviteOnly` chalu ho to bina code khaata nahi banta (`INVITE_REQUIRED`). Galat/khatm/band code par
    `INVALID_INVITE`. Kisi bhi sahi code se khaata **pilot** ban jaata hai. Coordinator ke banaye sellers bhi pilot hain.
  - Code ka istemaal atomic hai: aakhri jagah par do log ek saath aayein to sirf ek ko milti hai (test hai).
    Number pehle se registered ho to istemaal wapas ho jaata hai.
  - `INVITE_ONLY=true` (env) shuru ki haalat hai; `render.yaml` mein pilot ke liye `true` hai.
- **"क्या जवाब सही था?"** har saved jaanch ke baad: bade 👍 हाँ, सही / 👎 नहीं button (ek tap mein save), phir
  chaahein to 🎤 bolkar ya likhkar baat (500 akshar).
  - Diagnosis response mein ab `historyId` aata hai. Feedback `diagnosis_feedback` mein us jaanch se juda hai
    (fasal, samasya, severity ke saath).
  - Jawab badla ja sakta hai. Doosra phone kisi aur ki jaanch par jawab nahi de sakta.
  - Export (Task 6) mein device id kabhi nahi jaata. "मेरा डेटा" mein dikhta hai aur mitane par mit jaata hai.
- **मदद/शिकायत:** upar app bar mein 🛟 button → `#/help`.
  - Vishay chunein (फसल, ऐप, ऑर्डर, पैसे, खाता, कुछ और), 🎤 bolein ya likhein.
  - Bina khaate wale kisan chaahein to wapas phone ke liye number de sakte hain.
  - Coordinator **मदद/शिकायत** tab mein dekhta hai: kaun (ya "बिना खाते के"), phone (tap karke call), aur "हल हो गया"
    (audit). Per IP 20/ghanta.
- **संयोजक पैनल** mein 4 naye tab: मदद/शिकायत, इनवाइट कोड, सुविधाएँ, बदलाव का रिकॉर्ड (audit log).

**Decisions:**
- "Voice feedback" = phone par hi awaaz se text (Web Speech API). **Audio kabhi upload ya save nahi hota**: kam data,
  zyada privacy, aur coordinator ko padhna aasaan.
- Pilot membership khaate par hai. Bina khaate wale kisan sirf `all` wale features dekhte hain.
- App bar ke gol button 56px se 48px kiye, taaki 360px par teen button (मदद, खाता, सूचना) aa sakein (48px abhi bhi bade ungli ke liye theek hai).
- AdminReports ka "run" helper ab sab tabs ke saath `adminAction.ts` mein share hai (dohrav hataya).

## Task 6 – Metrics dashboard (privacy-first)

**Kya bana:**
- **Apna event tracking** (`modules/metrics/`, collection `events`). Koi third-party analytics nahi.
  - Event mein sirf: naam, samay, hafta, aur fixed values (fasal, result, category). Naam, phone, device id, jagah,
    photo ya likha hua text kabhi nahi.
  - Phone ki pehchaan ki jagah ek **weekly pseudonym** hai: `HMAC(server key, device id + hafta)`. Isse "is hafte kitne
    alag phone" gine ja sakte hain, par ek hi phone ko agle hafte se joda nahi ja sakta, aur bina server key ke wapas
    device id nahi banta. Key `METRICS_SALT` hai (na ho to `JWT_SECRET`).
  - Events 400 din baad apne-aap mit jaate hain (TTL). "मेरा डेटा मिटाएँ" par us phone ke saare hafton ke events bhi mitte hain.
  - Server khud record karta hai: jaanch (ok/unclear), chat sawaal, home dashboard, 👍/👎, follow-up, madad.
    App sirf `app_open` bhejta hai (din mein ek baar, sahmati ke baad).
  - Event likhna request ko kabhi dheema ya fail nahi karta (background mein; database na ho to chhod deta hai).
- **Pilot Dashboard** (संयोजक पैनल → **पायलट डैशबोर्ड**, flag `pilotDashboard`). 4/8/12/26 hafte chun sakte hain.
  - Upar tiles: is hafte sakriya kisan, chalu listings, poore orders, kul bikri, commission.
  - Har hafte: sakriya kisan (weekly active farmers), jaanchein (जवाब मिला / फोटो साफ़ नहीं), naye orders,
    poore orders, nayi listings, bikri.
  - AI 👍 dar fasal ke hisaab se (bar + %).
  - Follow-up nateeje: ठीक हुई / वैसी ही / खराब हुई.
  - **Kisan ka bhav vs mandi bhav** (prati quintal): listing ka ausat, sach mein bika (poore orders) ka ausat, aur
    aaj ka mandi modal (paas ki mandiyon ka median; `DATA_GOV_API_KEY` chahiye).
  - Har chart ke saath "टेबल में देखें" (screen reader/print ke liye) aur tap/hover par us hafte ka number.
- **CSV export** har hisse ka (`/api/admin/pilot/export/<naam>.csv`): weekly-active-farmers, diagnoses,
  ai-feedback-by-crop, follow-ups, market, price-vs-mandi.
  - Saath mein **किसानों की बातें** CSV (fasal, samasya, 👍/👎, comment, tareekh; device id nahi), KVK expert ke liye.
  - Har export audit log mein jaata hai. Excel-safe (formula injection se bachav, Hindi BOM).

**Decisions:**
- Listings, orders, bikri aur commission events se nahi, seedhe asli records (orders, commission ledger) se gine jaate
  hain: ye hamesha sahi rehte hain aur dohra hisaab nahi hota.
- "Weekly active farmer" = is hafte advisor ka koi bhi kaam karne wala alag phone. Ek kisan do phone par ho to do gina jaata hai.
- Chart ke rang dataviz validator se check kiye (primary-500 + accent-500: CVD ΔE 16.9 pass). Contrast warning ki wajah se
  legend aur table hamesha saath hain.
- CSV download ka code ab `api/client.ts` (`downloadFile`) mein ek jagah hai; commission CSV bhi wahi use karta hai.

## Task 7 – AI quality evaluation

**Kya bana:**
- **`eval/photos/`**: yahan KVK expert ki label ki hui photos + `labels.csv` (filename, crop, expected_problem,
  expected_status, keywords, labelled_by, notes). Namuna: `labels.example.csv`. Photos git mein nahi jaati.
- **`npm run eval`** (`backend/src/scripts/evalAi.ts`): har photo asli AI provider se jaanchta hai, bilkul app ki tarah
  (sirf photo + fasal ka naam). Phir `eval/reports/<samay>_<prompt version>.md` + `.json` banata hai:
  - accuracy (kul aur har fasal ki), low-confidence rate,
  - "unclear" photos (paudha nahi / dhundhli) par jawab na dena: **guess hua to ⚠️**,
  - galat jawab (expert vs AI) ki list,
  - dawai jo review chahiye: ⛔ banned/red-label naam, exact matra, packet note nahi,
  - pichhli report se har number ka badlav (`82% (+4)`).
- **Medicine review list** `services/dawaiSafety.ts` mein (`BANNED_OR_RED_LABEL_PESTICIDES`, Hindi + English naam,
  ⚠️ KVK se pakka karein). Dawai ke niyam ab bhi ek hi jagah hain.
- **Prompt versions** (`services/ai/promptVersions.ts`): diagnosis, chat, listing, price prompts ke naam + version +
  fingerprint. Har version ka poora text `eval/prompts/<version>.txt` mein hai (`npm run prompts:snapshot`).
  Text badla par version nahi badla to `npm test` fail hota hai. Report mein version + fingerprint hota hai.
- `eval/README.md` mein poora tareeka (Hinglish).

**Decisions:**
- Sahi/galat ka faisla: expert ka `expected_problem` AI ke problem name mein ho (thode alag likhne par bhi: space,
  nukta, chandrabindu ka fark nahi), ya koi `keywords` mile. Phir bhi galat-jawab list expert ko dekhni chahiye,
  kyunki shabd milna = sahi bimari hona zaroori nahi.
- Free tier ki wajah se default ek photo ek baar mein (`--concurrency 1`).
- **Asli photos aur asli Gemini se eval abhi nahi chala** (labelled photos nahi hain). Logic fake AI ke saath test hai.
- Bug pakda aur theek kiya: CSV mein khaali `expected_status` ab "ok" maana jaata hai (pehle line reject ho jaati).

## Task 8 – Performance aur load testing

### Farmer app (sasta Android phone)
- **Lazy loading:** ab sirf पहली screens (होम, सहमति, खेत की जानकारी) pehle download hoti hain. Baaki har screen
  (bazaar, orders, संयोजक पैनल, मौसम …) pehli baar kholne par aati hai. Phone khaali ho to फोटो जाँच aur मेरी जाँच
  peeche se pehle hi aa jaati hain (tap par turant khulti hain).
  - Main JS: **175 KB → 96 KB gzip** (610 KB → 305 KB). Pehli load par kul JS ~150 KB gzip (pehle ~175 KB + baaki
    sab ek saath). Coordinator panel (10 KB gz), order screen (12 KB gz), bazaar sirf zaroorat par.
  - Sentry ka code DSN na ho to bundle mein hai hi nahi (~2 KB ka loader).
- **Photos:** listing cards ab Cloudinary se **400px** copy lete hain (`?size=thumb`), gallery 1024px. WebP/AVIF
  apne-aap (`f_auto,q_auto`). `loading="lazy"` + `decoding="async"`. Phone par photo pehle se 1024px JPEG mein chhoti hoti hai.
- **Lighthouse (mobile, simulated slow 4G + 4× dheema CPU, production build, `vite preview`):**

  | Category | Score |
  | --- | ---: |
  | Performance | **91** |
  | Accessibility | **100** |
  | Best practices | **96** (sirf isliye kam: preview ke peeche backend nahi tha, API errors console mein) |

  FCP 2.3 s · LCP 2.3 s · TBT 230 ms · CLS 0.03 · Speed Index 2.3 s · TTI 3.5 s · kul 426 KB.
  Baaki sujhav: ~48 KB unused JS (framer-motion), CSS render-blocking ~300 ms.
- **Aage kya kar sakte hain (nahi kiya):**
  - framer-motion hatakar CSS transitions: ~40 KB gzip kam.
  - Hindi font (Mukta Devanagari 400+700, ~200 KB woff2) ki jagah phone ka Noto Devanagari: `font-display: swap`
    pehle se hai, isliye text turant dikhta hai, par data bachega.

### Load test (`npm run loadtest`, autocannon)
Asli app ek alag process mein (`NODE_ENV=production`), AI mock (1.5 s mein jawab, jaise Gemini), mausam mock, memory
MongoDB replica set: 200 kisan, 600 jaanchein, 60 listings. Har request alag IP se aati hai (asli phones jaisa).
Laptop: i5-8365U, 8 core, 8 GB. 15 s har run. Poora table: `backend/loadtest/results/2026-10-26-09-13.md`.

| Endpoint | 100 users: req/s · p50 · p99 | 500 users: req/s · p50 · p99 | Errors |
| --- | --- | --- | ---: |
| `/health` | 10,056 · 9 ms · 19 ms | 10,120 · 48 ms · 60 ms | 0 |
| बाज़ार browse `/api/market/listings` | 597 · 156 ms · 304 ms | 671 · 260 ms · 7.8 s | 0 |
| होम `/api/dashboard` | 536 · 167 ms · 938 ms | 579 · 287 ms · 10 s | 0 |
| मेरी जाँच `/api/history` | 1,604 · 56 ms · 92 ms | 1,670 · 291 ms · 361 ms | 0 |
| फोटो जाँच `/api/diagnose` (AI 1.5 s) | 60 · 1.51 s · 1.80 s | 300 · 1.52 s · 1.80 s | 0 |

"100/500 users" yahan matlab 100/500 connection **bina ruke** request bhej rahe hain. Asli kisan har 10–30 second mein
ek kaam karta hai, isliye 500 asli users ≈ 20–50 req/s, jo upar ki capacity se bahut kam hai.

**Bottlenecks jo mile:**
1. **Bazaar browse CPU-bound tha** (har result ka poora mongoose document banana): 272 req/s. `.lean()` se
   **496 req/s (+82%)** (20 connection par), aur p99 117 → 69 ms. Ye fix kiya.
2. **Overload par lambi poonch (p99 7–10 s, 500 connection):** ek Node process ka CPU bhar jaata hai, aur requests line
   mein lagti hain. Koi error nahi, sab 2xx. Pilot ke liye theek hai. Badhane ke liye: listings ka chhota cache
   (5–10 s), zyada CPU wala plan, ya 2+ instance (tab rate limit ke liye Redis store chahiye).
3. **Render free = 0.1 CPU** (is laptop ke ek core ka chhota hissa). Wahan andaazan in numbers ka ~1/10 milega
   (browse ~50–60 req/s). Pilot (20–50 kisan) ke liye kaafi, par asli launch par Starter plan lein.
4. **Photo jaanch ki asli seema Gemini hai, server nahi:** 500 ek saath chal rahi jaanchein server aaram se pakadta hai
   (p99 = AI ka samay). Gemini free tier ki per-minute limit pehle aayegi, tab app "अभी बहुत लोग…" dikhata hai.
5. Mongoose ki ek deprecation warning (`new: true`) bhi theek ki (`returnDocument: 'after'`).

**Decisions:**
- autocannon (Node, devDependency) chuna, k6 nahi: alag install nahi, aur test script TypeScript mein repo ke andar
  (`backend/loadtest/`). autocannon ke saath aaya purana `uuid` (moderate advisory, sirf dev) `overrides` se 11.x par kiya: `npm audit` 0.
- **Is machine par npm ne rolldown ka native binding phir chhod diya** (`npm ci` ke baad bhi). Fix:
  `npm install --no-save @rolldown/binding-linux-x64-gnu@<rolldown version>`. Lock file sahi hai, isliye CI par dikkat nahi.
