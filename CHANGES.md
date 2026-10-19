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
