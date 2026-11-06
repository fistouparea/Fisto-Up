"""Builds the government presentation deck (12 slides, 16:9) → deck.html. PDF: cd frontend && npm run showcase:pdf.
PPTX: python3 make_pptx.py (slide images + speaker notes). Every number is from showcase/SOURCES.md."""
import html

def phone(name, cap='', h=640):
    c = f'<p class="cap">{cap}</p>' if cap else ''
    return f'<div class="ph"><div class="frame" style="height:{h}px"><img src="../assets/shots/{name}.png" alt=""></div>{c}</div>'

def bullets(items):
    return '<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'

S = []
def slide(body, cls='', notes=''):
    S.append((body, cls, notes))

# 1 Title
slide('''<div class="title-l">
<div class="brand big"><div class="logo">A</div><div><div class="name">AgriAI</div><div class="sub">by Fisto Up</div></div></div>
<h1>खेती का साथी –<br>किसान के अपने फ़ोन पर</h1>
<p class="en">A Hindi farm assistant for Rajasthan’s smallholders, supported by village SHGs</p>
<p class="pill-y">प्रस्ताव: चूरू ज़िले में KVK और SHG के साथ 4 सप्ताह का निगरानी वाला पायलट</p>
</div>
<div class="title-r">''' + phone('result-problem', '', 760) + '</div>', 'title',
 'Namaste. AgriAI ek Hindi app hai jo kisan ke apne phone par chalta hai. Aaj hum ek cheez maangne aaye hain: Churu mein ek chhota, nigrani wala pilot.')

# 2 Problem
slide('''<h2>राजस्थान की खेती: बड़ा योगदान, बड़ी चुनौतियाँ</h2><p class="en">The problem – every number is sourced</p>
<div class="stats">
<div class="stat"><b>45.40%</b><span>देश की सरसों-राई राजस्थान में (2023-24)</span><i>Economic Survey 2023-24, Table 1.18 [S1]</i></div>
<div class="stat"><b>219 / 302</b><span>भूजल इकाइयाँ “अति-दोहित” (2022 आकलन)</span><i>PIB, Ministry of Jal Shakti, 8 Dec 2022 [S2]</i></div>
<div class="stat"><b>40% तक</b><span>दुनिया का फसल उत्पादन हर साल कीट-रोग से नष्ट</span><i>FAO, 2 Jun 2021 [S3]</i></div>
<div class="stat"><b>47</b><span>कृषि विज्ञान केंद्र राजस्थान में – सलाह है, पर खेत तक, उसी दिन पहुँचना कठिन</span><i>ICAR KVK list [S4]</i></div>
</div>''', '', 'Sirf sourced numbers. 40% global hai, Rajasthan ka alag number hum claim nahi karte.')

# 3 Farmer's day story
story = [('home','सुबह 7 बजे','मौसम चेतावनी: लंबा सूखा'),('result-problem','सुबह 10 बजे','सरसों पर चेपा – फोटो से जाँच'),('water','दोपहर','पानी: पहले मिट्टी देखें'),('sell-ai-draft','शाम','बाजरा बेचा – बोलकर'),('mandi-trips','अगले दिन','साथ में मंडी – भाड़ा बँटा')]
slide('<h2>AgriAI के साथ एक किसान का दिन</h2><p class="en">A farmer’s day – illustrative story, demo data</p><div class="story">' + ''.join(f'<div class="st"><div class="time">{t}</div>{phone(n, c, 520)}</div>' for n, t, c in story) + '</div><p class="foot-note">उदाहरण की कहानी, डेमो डेटा पर। असली किसानों के अनुभव पायलट में दर्ज होंगे।</p>', '',
 'Kahani kaalpanik hai, screens asli app ki hain, data demo hai.')

# 4 AI Advisor
slide('<div class="two"><div><h2>AI फसल सलाहकार</h2><p class="en">AI crop advisor</p>' + bullets([
 'फोटो + फसल → समस्या, कारण, देसी उपाय, सावधानी',
 'दवाई केवल generic नाम से – सटीक मात्रा कभी नहीं',
 'आगे सवाल पूछें, 🔊 पूरा सुनें',
 'हर जवाब: “KVK से पक्का करें”',
 'AI बदला जा सकता है – एक ही interface के पीछे']) + '<p class="note">स्क्रीन पर: असली AI (Gemini) का पहले रिकॉर्ड किया जवाब, खुले लाइसेंस की फोटो पर।</p></div><div class="phones">' + phone('check-photo','फोटो') + phone('result-problem','समस्या') + phone('result-dawai','उपाय') + '</div></div>', '',
 'Accuracy ka number nahi bata rahe – KVK review pilot se pehle.')

# 5 Marketplace
slide('<div class="two"><div><h2>बाज़ार: फोटो और आवाज़ से बिक्री</h2><p class="en">Marketplace</p>' + bullets([
 'विक्रेता फोटो ले, बोले – AI फ़ॉर्म भरता है, विक्रेता पक्का करता है',
 'भाव सुझाव, ऑर्डर, घर पर डिलीवरी',
 'डिलीवरी वाला: बिना लॉगिन लिंक, खरीदार को हर कदम दिखता है',
 'पैसे सीधे किसान को – UPI या नकद (ऐप में पैसा नहीं रुकता)',
 'हर ऑर्डर पर शिकायत, 48 घंटे में जवाब']) + '</div><div class="phones">' + phone('sell-ai-draft','AI ने भरा') + phone('market','बाज़ार') + phone('delivery','डिलीवरी') + '</div></div>', '',
 'Commission sirf poore order par (abhi 3%). Online payment jaan-boojhkar nahi.')

# 6 Ecosystem
slide('<div class="two"><div><h2>किसान का पूरा तंत्र</h2><p class="en">Farmer ecosystem</p>' + bullets([
 'सरकारी योजनाएँ: सरल हिंदी + आधिकारिक लिंक (आवेदन नहीं करता)',
 'मशीन किराया: दिन चुनें, मालिक “हाँ” कहे, दोनों को नंबर',
 'साथ में मंडी: एक गाड़ी, कई किसान, भाड़ा बँटे',
 'मज़दूर और पशु (संयोजक की मंज़ूरी के बाद)']) + '</div><div class="phones">' + phone('schemes','योजनाएँ') + phone('rental','किराया') + phone('mandi-trips','साथ में मंडी') + '</div></div>', '',
 'Yojana data abhi verify hona baaki hai (PM-KISAN ke alawa). Pashu ka legal review baaki.')

# 7 Safety & privacy
slide('<div class="two"><div><h2>सुरक्षा और गोपनीयता</h2><p class="en">Safety &amp; privacy</p>' + bullets([
 '<b>अंदाज़ा नहीं:</b> फोटो साफ़ न हो या भरोसा कम – नई फोटो माँगता है',
 '<b>प्रतिबंधित दवाई</b> सर्वर पर ब्लॉक',
 '<b>AI को केवल फोटो + फसल का नाम</b> – नाम, नंबर, स्थान नहीं',
 'जाँच की फोटो सहेजी नहीं जाती; “मेरा डेटा” से डाउनलोड/तुरंत मिटाएँ',
 'सहमति पहले; न बदलने वाला ऑडिट लॉग; एन्क्रिप्टेड बैकअप 14 दिन',
 'DPDP नियम 2025 (14 नवं 2025 अधिसूचित) [S5] – नीति का कानूनी रिव्यू बाकी']) + '</div><div class="phones">' + phone('unclear','अस्पष्ट फोटो') + phone('result-kvk','KVK सलाह') + phone('consent','सहमति') + '</div></div>', '',
 'Data region: database Mumbai (planned), server Singapore (planned). Photo Google ko jaati hai, store nahi hoti.')

# 8 SHG coordinator
slide('<div class="two"><div><h2>गाँव की SHG दीदी: संयोजक</h2><p class="en">SHG coordinator &amp; pilot dashboard</p>' + bullets([
 'विक्रेता सत्यापन: फ़ोन पर बात, ₹1 UPI जाँच, दवाई डीलर का लाइसेंस',
 'न पढ़ पाने वालों के लिए “मदद से लिस्टिंग” (सहमति दर्ज)',
 'शिकायत कतार – 48 घंटे; बार-बार शिकायत पर विक्रेता चिह्नित',
 'पायलट डैशबोर्ड: केवल गिनती, किसी किसान का नाम नहीं',
 'हिंदी/हिंग्लिश ट्रेनिंग मैनुअल और रोज़ की चेकलिस्ट तैयार']) + '</div><div class="phones">' + phone('admin-overview','सारांश') + phone('admin-pilot','पायलट डैशबोर्ड') + phone('admin-complaints','शिकायत') + '</div></div>', '',
 'Didi ka maandey SHG ke saath tay hoga – abhi koi vaada nahi.')

# 9 Status
slide('''<h2>क्या बना है – सही स्थिति</h2><p class="en">What is built – honest status</p>
<div class="status">
<div class="col built"><h3>बना हुआ और काम करता है</h3><p class="en">Built and working</p><ul><li>फोटो जाँच, चैट, आवाज़</li><li>मौसम, पानी, फसल कैलेंडर, सूचनाएँ</li><li>बाज़ार, ऑर्डर, डिलीवरी लिंक, शिकायत</li><li>साथ में मंडी, किराया, योजनाएँ</li><li>संयोजक पैनल, ऑडिट लॉग</li><li>सहमति, “मेरा डेटा”, ऑफ़लाइन डेमो</li></ul></div>
<div class="col tested"><h3>डेमो डेटा पर जाँचा</h3><p class="en">Tested with demo data</p><ul><li>566 सर्वर टेस्ट, 146 ऐप टेस्ट</li><li>8 एंड-टू-एंड फ़ोन यात्राएँ</li><li>सुगम्यता (WCAG 2.1 A/AA) जाँच</li><li>असली AI जवाब, खुले लाइसेंस की रोग-फोटो पर</li><li>360 px सस्ते फ़ोन की स्क्रीन</li></ul></div>
<div class="col planned"><h3>योजना / पायलट में</h3><p class="en">Planned / needs pilot</p><ul><li>KVK द्वारा AI सटीकता समीक्षा</li><li>क्लाउड पर तैनाती (तैयार, चालू नहीं)</li><li>नीति/शर्तों की कानूनी समीक्षा</li><li>असली किसान, SHG</li><li>उपज/आय पर असर – <b>दावा नहीं</b></li></ul></div>
</div>''', '', 'Kabhi "proven" nahi bolna. Jo tested hai woh demo data par.')

# 10 Pilot plan
slide('''<h2>पायलट योजना: चूरू, 4 सप्ताह</h2><p class="en">Pilot plan with metrics (targets, not results)</p>
<div class="two pilot"><div>
<div class="weeks"><div><b>सप्ताह 0</b>KVK फोटो समीक्षा, तैनाती, दीदी प्रशिक्षण</div><div><b>सप्ताह 1</b>2 गाँवों में कैंप, सहमति, विक्रेता सत्यापन</div><div><b>सप्ताह 2</b>तीसरा गाँव, फीडबैक #1, KVK नमूना जाँच</div><div><b>सप्ताह 3</b>बिक्री, मंडी गाड़ी, शिकायत SLA</div><div><b>सप्ताह 4</b>फीडबैक #2, नतीजे, जारी/रोकें का फ़ैसला</div></div>
<p class="note">20–50 किसान · 2–3 SHG समूह · 1 KVK विशेषज्ञ · हर सोमवार समीक्षा</p>
</div><div>
<table class="metrics"><tr><th>मापदंड (डैशबोर्ड से)</th><th>लक्ष्य</th><th>न्यूनतम</th></tr>
<tr><td>जुड़े किसान (सहमति सहित)</td><td>40</td><td>20</td></tr>
<tr><td>सक्रिय किसान, सप्ताह 4</td><td>50%</td><td>25%</td></tr>
<tr><td>AI जवाब पर 👍</td><td>≥ 70%</td><td>≥ 55%</td></tr>
<tr><td>KVK नमूना: सही + आंशिक</td><td>≥ 80%</td><td>≥ 70%</td></tr>
<tr><td>प्रतिबंधित दवाई की सलाह</td><td>0</td><td>0</td></tr>
<tr><td>पूरे ऑर्डर</td><td>15</td><td>5</td></tr>
<tr><td>शिकायत का 48 घंटे में जवाब</td><td>100%</td><td>90%</td></tr>
</table>
<p class="note">तुरंत रोकें: प्रतिबंधित दवाई की सलाह, डेटा लीक या धोखा।</p>
</div></div>''', '', 'Ye lakshya hain, nateeje nahi. Pilot plan: launch-kit/4-pilot.')

# 11 Ask
slide('''<h2>हमारा अनुरोध</h2><p class="en">Our request</p>
<div class="asks">
<div><span>1</span><b>पायलट की अनुमति</b><p>चूरू ज़िले में 4 सप्ताह, 20–50 किसान, ज़िला प्रशासन की निगरानी में</p></div>
<div><span>2</span><b>KVK विशेषज्ञ का समय</b><p>पायलट से पहले 100 फोटो की समीक्षा, पायलट में नमूना जाँच</p></div>
<div><span>3</span><b>2–3 SHG समूहों से परिचय</b><p>जो गाँव संयोजक बनना चाहें (जैसे राजीविका समूह)</p></div>
<div><span>4</span><b>नतीजे साथ में देखें</b><p>साप्ताहिक रिपोर्ट, पहले से तय रोकने/जारी रखने के नियम</p></div>
</div>
<p class="big-note">पायलट के लिए कोई राशि नहीं माँग रहे। ऐप, प्रशिक्षण सामग्री और तकनीकी संचालन – Fisto Up।</p>''', 'ask', 'Clear ask, phir chup ho jaayein aur sawaal lein.')

# 12 Contact
slide('''<div class="title-l">
<div class="brand big"><div class="logo">A</div><div><div class="name">AgriAI</div><div class="sub">by Fisto Up</div></div></div>
<h1>धन्यवाद</h1>
<p class="en">Thank you</p>
<p class="contact">[नाम] · [फ़ोन] · [ईमेल]</p>
<p class="srcs">स्रोत / Sources: [S1] Economic Survey 2023-24, Stat. Appendix Table 1.18 · [S2] PIB, Ministry of Jal Shakti, 8 Dec 2022 · [S3] FAO, 2 Jun 2021 · [S4] ICAR KVK list · [S5] PIB, MeitY, 14 Nov 2025 · links: showcase/SOURCES.md · Demo photos: Wikimedia Commons (CC0 / CC BY-SA 4.0)</p>
</div><div class="title-r">''' + phone('home', '', 760) + '</div>', 'title', '')

CSS = open('deck.css').read()
pages = []
for i, (body, cls, notes) in enumerate(S, 1):
    pages.append(f'<section class="slide {cls}" data-notes="{html.escape(notes)}">{body}<div class="num">{i}</div></section>')
open('deck.html', 'w').write(f'''<!doctype html><html lang="hi"><head><meta charset="utf-8"><title>AgriAI – Government presentation</title>
<style>{CSS}</style></head><body>{''.join(pages)}</body></html>''')
print(len(S), 'slides')
