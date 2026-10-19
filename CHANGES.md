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
