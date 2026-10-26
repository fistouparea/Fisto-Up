# AI quality evaluation (AI ki jaanch)

Isse pata chalta hai ki AI kitni baar **sahi bimari** batata hai, kitni baar "साफ़ फोटो लें" kehta hai, aur kya kabhi
**galat ya khatarnak dawai** sujhata hai. Prompt badalne se pehle aur baad mein chalayein, aur dono report milayein.

## 1. Photos aur labels daalein

1. KVK expert ke saath asli khet ki photos lein (har fasal ki 10–30, alag-alag bimari, kuch swasth paudhe, aur 3–5
   aisi photo jo paudha nahi hain ya bahut dhundhli hain).
2. Photos `eval/photos/` mein rakhein (JPEG/PNG/WebP). Ye folder git mein nahi jaata.
3. `labels.example.csv` ko `eval/photos/labels.csv` naam se copy karein aur har photo ki ek line bharein:

| Column | Kya likhein |
| --- | --- |
| `filename` | photo ka naam, jaise `bajra_001.jpg` |
| `crop` | `bajra`, `guar`, `moong`, `moth`, `chana`, `sarson`, `jeera`, `gehun`, `other` (jo kisan app mein chunega) |
| `expected_problem` | expert ke hisaab se sahi samasya, Hindi mein (swasth ho to "पौधा स्वस्थ है") |
| `expected_status` | `ok` (khaali = ok). Paudha nahi / bahut dhundhli photo ho to `unclear`: app ko jawab **nahi** dena chahiye |
| `keywords` | aur shabd jo sahi maane jaayein, `|` se alag: `downy mildew|हरी बाली` |
| `labelled_by` | expert ka naam |
| `notes` | kuch bhi (report mein nahi jaata) |

Excel mein bharkar "CSV UTF-8" mein save karein (Hindi sahi rahe).

## 2. Chalayein

```bash
cd backend
npm run eval                                 # sab photos (backend/.env ki Gemini key se)
npm run eval -- --limit 10                   # pehle sirf 10 se check
npm run eval -- --concurrency 2              # 2 ek saath (free tier par 1 hi rakhein)
```

Har photo par wahi hota hai jo app mein: sirf photo aur fasal ka naam AI ko jaata hai. Free tier par
per-minute limit hai; provider apne-aap ruk kar dobara koshish karta hai.

## 3. Report padhein (`eval/reports/`)

Har run do file banata hai: `<samay>_<prompt version>.md` (padhne ke liye) aur `.json` (poora data).

- **Accuracy:** label wali photos mein se kitne par sahi jawab dikha.
- **Low-confidence rate:** kitni label wali photos par app ne "साफ़ फोटो लें" kaha (AI ko bharosa nahi tha).
- **"Unclear" photos refused:** paudha-nahi/dhundhli photos par jawab na dena. Ye **hamesha 100%** hona chahiye;
  "guessed" aaye to turant dekhein.
- **Per crop** table: kis fasal par AI kamzor hai.
- **Wrong answers:** expert ke liye list (photo, expert ka jawab, AI ka jawab).
- **Medicine suggestions to review:** jin dawaiyon mein
  - ⛔ banned / red-label naam hai (`backend/src/services/dawaiSafety.ts`, ⚠️ KVK se list pakki karein),
  - exact matra likhi hai (niyam: matra sirf packet se),
  - ya packet wala note nahi hai.
- Pichhli report se badlav har number ke saath likha hota hai (jaise `82% (+4)`).

## 4. Prompt badalna (versions)

Saare AI prompts ka ek version hai (`backend/src/services/ai/promptVersions.ts`), aur har version ka poora text
`eval/prompts/<version>.txt` mein hai. Report mein version + fingerprint likha hota hai, isliye do report ki tulna saaf hai.

1. `backend/src/services/ai/prompt.ts` (ya `marketPrompt.ts`) mein text badlein.
2. `promptVersions.ts` mein us prompt ka version badhayein (`diagnosis-v1` → `diagnosis-v2`).
3. `cd backend && npm run prompts:snapshot` → `eval/prompts/diagnosis-v2.txt` aur lock file ban jaate hain.
4. `npm run eval` → nayi report ko purani se milayein. Behtar ho tabhi commit karein.

Text badla par version nahi, to `npm test` fail hota hai (taaki bina naam ka badlav na ho).
