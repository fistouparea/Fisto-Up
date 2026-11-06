# AgriAI – Launch Checklist (pilot, Churu)

Simple Hinglish mein: kya taiyaar hai, kya insaan ko karna hai, aur phone par har feature kaise test karein.
Detail ke liye CHANGES.md (Phase 1–6), README.md aur DEPLOY.md dekhein.

---

## 1. Kya complete aur tested hai

**Automatic tests (har commit se pehle aur CI mein):**
- Backend: API + rules ke tests, asli (in-memory) MongoDB replica set par. Frontend: unit tests.
- **E2E (Playwright, 360 px phone, Chromium):** 7 zaroori safar + accessibility check, fake AI ke saath, seed wale
  demo data par (`cd frontend && npm run e2e`; CI job "e2e"; 2 baar lagatar pass):
  1. Kisan: sahmati → फोटो जाँच → जवाब → और पूछें (chat)
  2. Snap & List → kharidar ka order → स्वीकार → delivery link (bina login) → पैसे मिल गए → पूरा → rating
  3. जाँच → ज़रूरी सामान → licensed dealer ka साझेदार product
  4. Machine kiraye par: din chunna → malik "हाँ" → dono ko phone number
  5. साथ में मंडी: kisan judta hai → sanyojak ko kaun/kitna dikhta hai
  6. Shikayat → sanyojak "काम शुरू" → "हल हुई" + note → kisan ko faisla dikhta hai
  7. Internet band → app khulta hai, purani jaankari + "इंटरनेट नहीं है" banner
  8. axe (WCAG 2.1 A/AA): 24 mukhya screens par 0 violations
- Backend 549 tests, frontend 146 unit tests. Lint, type-check, build: dono apps clean (`scripts/check-all.sh`).
- `npm audit --audit-level=high`: clean. (Frontend ke PWA build tools mein moderate advisories hain – sirf build ke
  samay, phone tak nahi jaate; `vite-plugin-pwa` ka downgrade jaan-boojhkar nahi kiya.)
- Speed: pehli load JS 146 KB gzip (Phase 4: 148), Lighthouse mobile 92–93 / 100 / 96.
- 360px screenshots: `docs/screenshots/` (Phase 6: `p6-*`).

**Features (sab feature flag par, default "pilot"):**
- Phase 1–2: फोटो जाँच, और पूछें, 🎤/🔊, मेरी जाँच, मेरा खेत, मौसम, पानी, फसल कैलेंडर, सूचनाएँ, मंडी भाव, offline.
- Phase 3: बाज़ार (Snap & List, भाव सुझाव, order state machine, UPI/नकद, rating), संयोजक पैनल, commission ledger.
- Phase 4: security, logs/Sentry, deploy setup, sahmati + मेरा डेटा, pilot mode, feedback, metrics, AI eval.
- Phase 5: ज़रूरी सामान (AI-Kit) + input dealers, बोलकर चलाएँ, भाषा (हिंदी/English/राजस्थानी draft), सरकारी योजनाएँ,
  machine/मज़दूर/पशु (ek services engine), साथ में मंडी.
- Phase 6: mandi trip ka sanyojak screen, delivery tracking link, shikayat aur vivaad, E2E tests, seed check.

---

## 2. Abhi bhi insaan ko kya karna hai

### Deployment (DEPLOY.md ke steps 0–10)
- [ ] Naye secrets banayein (Gemini key, `JWT_SECRET`, `BACKUP_PASSPHRASE`, VAPID). Laptop ki `.env` production mein na lagayein.
- [ ] Free accounts: GitHub (private), MongoDB Atlas M0 (Mumbai), Cloudinary, Sentry, Render, UptimeRobot.
- [ ] Render Blueprint se deploy; `/health` aur `/ready` = ok; login + reload test.
- [ ] Domain + `CORS_ORIGIN`; HTTPS (mic aur "Install app" ke liye zaroori).
- [ ] Pehla coordinator: `npm run create-coordinator`. **Production mein `npm run seed` kabhi na chalayein.**
- [ ] GitHub: branch rule – "backend", "frontend", "e2e", "docker" checks pass hone zaroori.
- [ ] Backup workflow chalayein aur ek baar restore test karein.
- [ ] Feature flags (`#/admin/flags`): pilot ke liye jo suvidha sabko dikhani hai use "सबके लिए" karein.

### KVK / krishi expert
- [ ] 50–150 labelled photos se `npm run eval`; asli Gemini ke jawab KVK expert ke saath padhein.
- [ ] Banned/restricted dawai list (`backend/src/services/dawaiSafety.ts`, `backend/src/config/inputRules.ts`) aur generic
      naam (`backend/src/data/inputGenerics.ts`) pakke karein.
- [ ] `agroRules.ts` (garmi/pala/baarish, paani) aur `cropCalendar.ts` pakke karein.

### Local speaker (Marwari / Shekhawati)
- [ ] `frontend/src/strings/raj.ts` (poori file draft hai), voice keywords (`backend/src/config/voiceIntents.ts`),
      `backend/src/data/dialectGlossary.ts`. Kisano ke saath padh kar galat shabd sudharein.

### Yojana data
- [ ] `backend/src/data/schemes.ts`: PM-KISAN ke alawa sab "verify" hain (rakam, shartein, kaagaz, helpline nahi likhe).
      Sanyojak panel → योजनाएँ tab se official site padh kar bharein, source + date ke saath.

### Kanoon (legal review)
- [ ] Privacy Policy + Terms (Hindi + English, DRAFT), sahmati ka text, data kitne din rakhte hain.
- [ ] Pashu bechne/le jaane ka notice (`hi.services.livestock.legal`) – Rajasthan ke oont aur govansh niyam.
- [ ] FSSAI number wala field (SHG khana), input dealer licence ki prakriya, referral commission ki shart.
- [ ] Grievance officer ka naam aur contact policy mein.

### Pilot plan
- [ ] 2–3 coordinators ki training: panel, invite code, shikayat kataar, mandi gaadi, delivery link, CSV.
- [ ] Har SHG/gaanv ke liye invite code; sellers aur input dealers verify (UPI ₹1, licence kaagaz).
- [ ] Ek poora asli order (₹1–10) aur ek machine booking test.
- [ ] Har hafte: Pilot Dashboard, shikayat SLA (48 ghante), Sentry, commission vasooli, Atlas storage.

---

## 3. Phone par test (har mukhya feature)

Taiyari: HTTPS URL (Cloudflare tunnel ya deploy) sasta Android + Chrome par kholein. Demo ke liye laptop par
`npm run seed` (sirf demo database!). Sab demo PIN **2580**: sanyojak 9000000001, रमेश (seller) 9000000101,
input dealer 9000000106, होटल (buyer) 9000000201, अनीता (buyer/kisan) 9000000202, मज़दूर 9000000203.

1. **Install + sahmati:** Chrome menu → Install app. Pehli baar sahmati screen → 🔊 → "मैं सहमत हूँ".
2. **फोटो जाँच:** जाँच → बाजरा → फोटो लें → जाँच करें → जवाब, dawai warning, KVK line → और पूछें mein sawaal → 👍/👎.
3. **ज़रूरी सामान:** jawab ke neeche generic dawai naam + "साझेदार दुकान" product → kholein → (buyer login) order.
4. **बोलकर चलाएँ:** neeche-daayein peela 🎤 → "मौसम बताओ" → मौसम screen. सेटिंग → पढ़कर सुनाएँ ON.
5. **भाषा:** सेटिंग → राजस्थानी / English → menu badalta hai. "जवाब राजस्थानी में" → और पूछें.
6. **योजनाएँ:** होम → और सुविधाएँ → सरकारी योजनाएँ → 🔊, आधिकारिक साइट.
7. **बेचें + order + delivery:** 9000000101 se बेचें (फोटो + बोलें) → 9000000201 se kharidein (delivery) → seller स्वीकार →
   माल तैयार → डिलीवरी पर भेजा → sanyojak: ऑर्डर tab → डिलीवरी वाला + "लिंक बनाएँ" → WhatsApp → doosre phone par
   link: उठा लिया → रास्ते में → फोटो → पहुँचा दिया → buyer timeline → सामान मिल गया → seller पैसे मिल गए → buyer पूरा + ★.
8. **Machine kiraya:** 9000000202 → किराए पर मशीन (paas kuch nahi to "दूर के भी देखें") → tractor → din → बुकिंग माँगें →
   9000000101 se booking kholein → "हाँ, मंज़ूर" → dono ko number.
9. **Majdoor:** 9000000203 → apni listing → "आपके लिए मिलान". 18+ tick ke bina listing nahi banti.
10. **Pashu:** pashu daalein → "मंज़ूरी बाकी" → sanyojak "मशीन/पशु मंज़ूरी" → मंज़ूर.
11. **साथ में मंडी:** 9000000203 → होम → साथ में मंडी → fasal + quintal → जुड़ें. Sanyojak "मंडी गाड़ी" tab: naam/phone dikhe,
    तारीख बदलें → kisan ko suchna; "गाड़ी निकल गई" → "सफ़र पूरा".
12. **Shikayat:** kisi listing/order/booking par "शिकायत करें" → wajah + bolkar + photo → sanyojak "शिकायत कतार" →
    संदेश → काम शुरू → note ke saath हल हुई → kisan ko faisla. Ek seller par 3 sahi shikayat → "बार-बार शिकायत" badge.
13. **Offline:** app ek baar online kholein → airplane mode → app kholein → purani jaankari + banner.
14. **मेरा डेटा:** मेरा खेत → मेरा डेटा → download → (test account par) mitayein.

---

## 4. Launch Kit (`launch-kit/`) – pilot ke liye kaagaz aur scripts

Har `.html` source hai, uske bagal ki `.pdf` print ke liye (A4). HTML badla to PDF dobara banayein:
`cd frontend && npm run launch-kit:pdf`. Guide ki phone photos dobara lene ke liye:
`cd frontend && npx playwright test -c playwright.screens.config.ts launchKit` (→ `launch-kit/assets/shots/`).

| File | Kya hai | Kya karein |
| --- | --- | --- |
| `1-kvk-review/PHOTO-GUIDE.md` | KVK ke saath 100 labelled photos lene aur nateeje app mein daalne ki guide (Hinglish) | Pilot se pehle KVK visit ka plan isi se |
| `1-kvk-review/expert-review.pdf` (+ `.html`, `.csv`) | Saare AI prompts + agro niyam (236), khaali "sahi/sudhaar" column | Print karke KVK expert se bharwayein; `npm run kvk:rules` se naya banta hai |
| `backend: npm run kvk:sheet` | `eval/photos` ki har photo par AI ka jawab → `1-kvk-review/out/review-sheet-<date>.csv` (expert columns ke saath) | Excel mein kholkar expert ke saath सही / गलत / आंशिक bharein |
| `2-farmer-guide/farmer-guide.pdf` | 6 page, Hindi, photo-pehle: kholna, home screen, photo jaanch, bolkar, mausam/paani, bechna, mandi gaadi | Har kisan ko 1 copy (camp mein); peeche didi ka naam/number likhein |
| `2-farmer-guide/poster.pdf` | 1 page poster, QR ki jagah khaali | Asli app link ka QR chipka kar gaanv/SHG/KVK mein lagayein |
| `3-coordinator/coordinator-manual.pdf` | SHG didi ki training (Hinglish, screenshots): verify, madad se listing, orders, delivery link, shikayat, mandi gaadi, commission, dashboard, invite code | Training (2 ghante) mein saath padhein, demo phone par karwayein |
| `3-coordinator/daily-checklist.pdf` | Roz ka 1-page checklist | Har didi ko ~30 copy |
| `4-pilot/pilot-plan.pdf` | 4 hafte ka plan: kaun kya, camp format, data, target numbers, weekly review template, stop/continue niyam | Pilot ka "rulebook"; har somvaar review page print karein |
| `4-pilot/consent-form.pdf` | Hindi sahmati patra (hastakshar/angootha) | Har kisan ka 1, camp mein padh kar sunayein; didi ke paas surakshit |
| `4-pilot/feedback-form.pdf` | Hindi feedback (12 sawaal, bina naam) | Hafta 2 aur 4 mein har kisan se; Excel mein bharein |
| `5-demo/demo-script.pdf` | 5 minute demo (Hinglish): samay, bolne ki baat, exact click, backup, sawaal-jawab | Demo se pehle 2 baar practice |
| `backend: npm run demo:reset` | Demo database khaali karke saaf demo data (seed) + pilot suvidhaayein on | Sirf `agriai_demo…` naam wale DB par chalta hai (`DEMO_MONGO_URI`), production mein mana karta hai |
| `assets/` | `print.css`, Mukta font, guide ki phone photos | Badlav ki zaroorat nahi |

Launch Kit ke dauraan app ka koi feature nahi badla aur koi bug nahi mila. Naya code sirf scripts: `kvk:sheet`,
`kvk:rules`, `demo:reset` (tests: `backend/tests/kvkReview.test.ts`, `backend/tests/demoGuard.test.ts`).

- [ ] Poster/guide par asli app link + QR + didi ka number daalein, phir print.
- [ ] KVK review (1) pass hone ke baad hi pilot camp (4).
- [ ] Demo se pehle `npm run demo:reset` aur ek practice run (5).

---

## 5. Showcase Kit (`showcase/`) – Rajasthan sarkar ke senior officers ke liye

Sab files: HTML source + PDF. PDF dobara: `cd frontend && npm run showcase:pdf`. Har sankhya ka source:
`showcase/SOURCES.md` (jo wahan nahi, woh kahin nahi bola gaya). AI accuracy ka koi number nahi (eval report abhi nahi hai).

| File | Kya hai | Print / laptop / phone |
| --- | --- | --- |
| `SOURCES.md` | Har sankhya ka source (naam, saal, link), assumptions, jo daave hum nahi karte | Laptop (sawaal aaye to kholein) |
| `4-brief/brief-hi.pdf`, `brief-en.pdf` | 2 page executive brief: samasya (sourced), samadhan, 4 screenshot, suraksha, privacy, sarkari prayaso mein madad, sahi sthiti, kharcha (anumaan), anurodh | **Print:** har officer ke liye 1 Hindi + 1 English (5+5), laptop par bhi |
| `5-deck/deck.pdf` (+ `deck.pptx`, `deck.html`) | 12 slide (Hindi headline, English sub-line): samasya → kisan ka din → AI → bazaar → tantra → suraksha → SHG → sthiti → pilot → anurodh | Laptop + pen drive. PPTX = har slide ek tasveer + speaker notes (badlav `build_deck.py` mein) |
| `scripts/demo.sh` | Offline demo: laptop par sab kuch, bina internet; asli AI ke pehle record kiye jawab (`DEMO_MODE`) | Laptop (ek din pehle offline test) |
| `2-demo-mode/demo-day-checklist.pdf` | 1 page: charge, offline test, backup phone, hotspot, agar fail ho to | **Print:** 1 (presenter) |
| `3-video/agriai-demo.mp4` (+ `.srt`) | 2 min 20 s backup video, Hindi captions, 4 flows | Laptop + phone + pen drive |
| `6-qa/qa-prep.pdf` | 25 mushkil sawaal + chhote imaandar jawab (Hinglish) | **Print:** 1 (presenter), meeting se pehle padhein |
| `7-one-pagers/architecture.pdf` | Ek page: diagram + saral bhasha mein kaise chalta hai | **Print:** 2–3 (IT/technical officer ke liye) |
| `7-one-pagers/security-privacy.pdf` | Ek page: kya data, kahan, kaun dekhta hai, kab tak, mitana, audit log, backup | **Print:** 2–3 |
| `launch-kit/4-pilot/pilot-plan.pdf` | 4 hafte ka pilot plan (anurodh ka aadhaar) | **Print:** 1–2 (agar detail maange) |

**Meeting se pehle:**
- [ ] Brief aur deck ke "[नाम] · [फ़ोन] · [ईमेल]" mein asli sampark bharein (`4-brief/build_brief.py`, `5-deck/build_deck.py`), PDF dobara banayein.
- [ ] Ek din pehle Wi-Fi band karke `scripts/demo.sh` se poora demo; checklist ke hisaab se taiyari.
- [ ] Q&A doc ek baar zor se padhein; "abhi nahi pata, pilot mein naapenge" kehne ki aadat.

**Meeting mein kram (30–40 min):**
1. Haath mein **brief (Hindi)** dein – officer 2 minute padhte hain jab aap laptop lagate hain.
2. **Deck slide 1–3** (3 min): samasya aur kisan ka din.
3. **Live demo** (`scripts/demo.sh`, 5 min): photo jaanch → "photo saaf nahi" → 🎤 mausam → bechna → sanyojak dashboard. Shuru mein bolein: "offline demo, asli AI ke record kiye jawab, demo data". Kuch atke → turant **video**.
4. **Deck slide 7–11** (5 min): suraksha, sahi sthiti, pilot, anurodh – anurodh ke baad ruk kar sawaal lein.
5. **Sawaal:** `qa-prep.pdf` + technical sawaal par **architecture** / **security-privacy** one-pager dein.
6. Ant mein: pilot plan (launch-kit) aur follow-up email (brief PDF) ka vaada.

Is kaam mein mila bug (theek kiya): photo cleanup job MongoDB connect hone se pehle index sync karta tha, isliye startup
par hamesha fail hota tha – ab connection ke baad chalta hai (`backend/src/jobs/photoCleanup.ts`).
