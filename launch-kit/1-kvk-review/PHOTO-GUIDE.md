# KVK expert ke saath 100 labelled photos – aapke liye guide (Hinglish)

Maqsad: asli Churu ke khet ki photos par AI ka jawab KVK expert se jaanchwana, aur galtiyon se prompt/niyam sudharna.
Ek din ka kaam hai (photos) + 1–2 ghante expert ke saath (review).

## 1. Taiyari (1 din pehle)
- KVK (Churu – Sardarshahar/ Ratangarh) mein Plant Protection ya Agronomy expert se 2 ghante ka samay lein.
- Saath le jaayein: charge kiya phone (achha camera), ye guide, `expert-review.pdf` (print), pen.
- Expert ko batayein: "AI kya jawab deta hai, aap sahi/galat batayein. Koi brand ya kampani nahi, sirf generic naam."

## 2. Photos kaise lein (100 photos, ~1 din)
Fasal ke hisaab se lagbhag (abhi jo khet mein hai uske hisaab se badlein):

| Fasal | Kitni | Kya-kya |
| --- | ---: | --- |
| बाजरा | 15 | जोगिया/हरी बाली, अर्गट, पत्ती धब्बा, swasth |
| ग्वार | 12 | झुलसा (blight), जड़ गलन, swasth |
| मूंग / मोठ | 15 | पीला मोज़ेक, सफ़ेद मक्खी, पत्ती धब्बा, swasth |
| चना | 12 | उकठा, फली छेदक, swasth |
| सरसों | 12 | माहू (चेपा), सफ़ेद रतुआ, आल्टरनेरिया, swasth |
| जीरा | 10 | झुलसा, छाछ्या (powdery mildew), uktha |
| गेहूं | 10 | रतुआ, दीमक, swasth |
| **"unclear"** | 14 | 5 dhundhli, 3 bahut door se, 3 andhere mein, 3 paudha hi nahi (mitti, haath, gaay) |

Har photo:
- **Bimar patta/paudha paas se**, din ki roshni mein, chhaya mein (seedhi dhoop mein chamak nahi).
- **File ka naam fasal se shuru karein:** `bajra_001.jpg`, `chana_014.jpg` (script isi se fasal pehchaanti hai).
- Kisan se poochhein: photo lene ki izaazat (seedhe kisan ka chehra photo mein na ho).
- Photos laptop par `eval/photos/` mein daalein (ye folder git mein nahi jaata – kisan ka data bahar nahi jaata).

## 3. Expert se label karwayein (`labels.csv`)
- `eval/photos/labels.example.csv` ko `eval/photos/labels.csv` naam se copy karein.
- Har photo ki ek line: `filename, crop, expected_problem` (expert ki bimari, Hindi), `expected_status`
  (`ok`, ya photo kharab ho to `unclear`), `keywords` (doosre naam, `|` se), `labelled_by` (expert ka naam).
- Excel mein bharein → **"CSV UTF-8"** mein save (Hindi sahi rahe). Detail: `eval/README.md`.

## 4. AI ka jawab nikaalein aur expert se review karwayein
```bash
cd backend
npm run kvk:sheet -- --limit 5     # pehle 5 se check (Gemini key backend/.env mein)
npm run kvk:sheet                  # sab photos → launch-kit/1-kvk-review/out/review-sheet-<date>.csv
npm run eval                       # accuracy report → eval/reports/ (labels.csv chahiye)
npm run kvk:rules                  # prompts + niyam → expert-review.html / .csv (phir: cd frontend && npm run launch-kit:pdf)
```
- `review-sheet-*.csv` Excel mein kholein, expert ke saath har line: **सही / गलत / आंशिक**, sahi jawab, dawai theek hai?, tippani.
  (Bina key ke format dekhna ho: `npm run kvk:sheet -- --dry-run`.)
- `expert-review.pdf` print karke expert se har niyam par "हाँ" ya sahi maan likhwayein (garmi/pala/baarish ki seema,
  paani ka antar, fasal ke charan, banned dawai list, generic naam).

## 5. Nateeje wapas app mein (developer / aap)
1. **Galat jawab** jo baar-baar aayein (jaise ek bimari ko doosri samajhna) → `backend/src/services/ai/prompt.ts`
   mein rule jodein → `promptVersions.ts` mein version badhayein → `npm run prompts:snapshot` → `npm run eval`
   dobara → report ki tulna (accuracy badhni chahiye, ⛔ banned dawai 0, unclear refused 100%).
2. **Niyam ke sudhar** (expert-review form) → "file" column wali file mein maan badlein
   (`config/agroRules.ts`, `data/cropCalendar.ts`, `services/dawaiSafety.ts`, `config/inputRules.ts`,
   `data/inputGenerics.ts`), `⚠️ verify with KVK` comment mein expert ka naam + tareekh likhein, tests chalayein.
3. Bhari hui sheet aur form ki scan copy `launch-kit/1-kvk-review/out/` mein rakhein (pilot ka record).
4. Pass hone ke maap-dand (pilot se pehle): accuracy **≥ 70%** (label wali photos), unclear refused **100%**,
   banned/red-label dawai **0**, exact matra wali dawai **0**.
