"""Builds the 2-page executive brief in English and Hindi (same facts, same sources) → brief-en.html, brief-hi.html."""
T = {
 'en': dict(
  lang='en', title='AgriAI – Executive brief',
  tag='Executive brief · November 2026<br>For the Government of Rajasthan',
  h1='A Hindi farm assistant on the farmer’s own phone – supported by village SHGs',
  lede='AgriAI helps a smallholder farmer check a sick crop from a photo, know when to water, get weather warnings, and sell produce – in simple Hindi, by touch or by voice. It is built and tested with demo data. <b>We request a supervised 4-week pilot in Churu district with KVK and SHG support.</b>',
  prob_h='The problem in Rajasthan',
  prob=[
   'Rajasthan grew <b>45.40%</b> of India’s rapeseed &amp; mustard and <b>14.66%</b> of India’s nutri/coarse cereals in 2023-24 <span class="s">[S1]</span>. Losses on these farms matter for the whole country.',
   '<b>219 of Rajasthan’s 302</b> groundwater assessment units were over-exploited in the 2022 assessment <span class="s">[S2]</span>. Every unnecessary irrigation counts.',
   'Pests and diseases destroy <b>up to 40%</b> of global crop production each year <span class="s">[S3]</span>. Early, correct identification makes the difference.',
   'Expert advice exists – Rajasthan has <b>47 Krishi Vigyan Kendras</b> <span class="s">[S4]</span> – but a farmer often needs an answer in the field, the same day, in their own language.',
  ],
  sol_h='What AgriAI does',
  sol=[
   ('AI crop advisor', 'Photo → problem, cause, desi remedies, generic medicine names, precautions; follow-up questions; 🔊 read-aloud.'),
   ('Farm advice', 'Weather alerts (heat, frost, rain, dry spell), water timing by crop stage, crop calendar – written rules, marked “verify with KVK”.'),
   ('Market &amp; ecosystem', 'Sell by photo + voice, orders, delivery tracking link, shared mandi trips, machine rental, scheme information with official links.'),
   ('SHG coordinator', 'Village SHG didi verifies sellers, helps non-readers list, resolves complaints in 48 h, runs mandi trips; pilot dashboard.'),
  ],
  shots=[('result-problem','Photo check: real AI answer (recorded)'),('water','Water advice by crop stage'),('sell-ai-draft','Selling: AI fills the form'),('admin-pilot','Pilot dashboard: counts only')],
  safety_h='Safety first',
  safety=[
   '<b>Refuses to guess:</b> if the photo is unclear, not a plant, or the AI is unsure, the app asks for a new photo – no answer is shown.',
   '<b>Medicine blocklist:</b> banned and restricted pesticides are removed by a server check after the AI; only generic names, never an exact dose.',
   '<b>KVK line on every answer:</b> “confirm with your nearest Krishi Vigyan Kendra”.',
   '<b>Accuracy:</b> not yet measured on field photos. A KVK expert review of 100 labelled photos is planned before the pilot (pass mark: ≥70% correct, 100% of unclear photos refused, 0 banned medicines).',
  ],
  priv_h='Data privacy',
  priv=[
   'The AI receives <b>only the photo and the crop name</b> – never a name, phone number or location (automatically tested). Check photos are not stored.',
   'Consent screen in simple Hindi with read-aloud; <b>“मेरा डेटा”</b> lets a farmer download or delete their data at once; append-only audit log of coordinator actions; encrypted backups kept 14 days.',
   'Designed around India’s DPDP Act, 2023 and DPDP Rules, 2025 (notified 14 Nov 2025, 18-month phased compliance) <span class="s">[S5]</span>. Policy and terms are drafts awaiting legal review.',
  ],
  gov_h='How it can support existing government efforts',
  gov=[
   '<b>KVKs:</b> every answer points farmers to the KVK; all thresholds are open for KVK experts to verify and correct.',
   '<b>SHGs (e.g. Rajeevika groups):</b> a defined role for SHG members as village coordinators (compensation to be agreed with the SHGs).',
   '<b>Schemes:</b> plain-Hindi scheme information that links to the official website; it does not process applications.',
   '<b>Public data:</b> can show mandi prices from data.gov.in. <i>No official partnership exists today.</i>',
  ],
  status_h='Honest status',
  status=[
   ('built','Built and working','Photo check, chat, voice, weather/water/calendar, marketplace, delivery link, complaints, mandi trips, rentals, schemes, coordinator panel, consent and “मेरा डेटा”, offline demo mode.'),
   ('tested','Tested with demo data','566 server tests, 146 app tests, 8 end-to-end phone journeys incl. accessibility; real AI answers recorded on openly licensed disease photos.'),
   ('planned','Planned / needs pilot','KVK accuracy review, cloud deployment, legal review, real farmers and SHGs, effect on yield or income (not claimed).'),
  ],
  cost_h='Running cost (estimate)',
  cost=[('Hosting (Render Starter)','$7 / month','[S10]'),('Database (MongoDB Atlas)','$0 (free, 512 MB) – $8 / month','[S8]'),('AI (Gemini 3.8 Flash)','≈ $8 per 1,000 photo checks*','[S6]'),('Pilot month, 50 farmers','≈ $15–32 (≈ ₹1,300–2,800)*','')],
  cost_note='*Estimate: ≈3,500 input + 1,500 output tokens per check; price until 31 Dec 2026 (doubles from 1 Jan 2027); a free tier may cover the pilot; ₹88/$ assumed. Render’s free tier is not for production <span class="s">[S7]</span>.',
  ask_h='Our request',
  ask=[
   'Permission for a <b>supervised 4-week pilot in Churu district</b> with 20–50 farmers and 2–3 SHG groups.',
   '<b>Time of one KVK expert (Churu):</b> review 100 photos before the pilot and sample answers during it.',
   'An introduction to <b>2–3 SHG groups</b> willing to act as coordinators.',
   'We share weekly results and pre-agreed stop/continue rules with the district administration. <b>No funds requested for the pilot.</b>',
  ],
  contact='Contact: Fisto Up · [Name] · [Phone] · [Email]',
  src='Sources: [S1] Economic Survey 2023-24, Stat. Appendix Table 1.18 · [S2] PIB, Ministry of Jal Shakti, 8 Dec 2022 · [S3] FAO, 2 Jun 2021 · [S4] ICAR KVK list · [S5] PIB, MeitY, 14 Nov 2025 · [S6] Gemini API pricing · [S7] Render docs · [S8] MongoDB Atlas pricing · [S10] Render, May 2026. Links: showcase/SOURCES.md',
 ),
 'hi': dict(
  lang='hi', title='AgriAI – कार्यकारी सारांश',
  tag='कार्यकारी सारांश · नवंबर 2026<br>राजस्थान सरकार के लिए',
  h1='किसान के अपने फ़ोन पर हिंदी कृषि सहायक – गाँव के स्वयं सहायता समूहों के साथ',
  lede='AgriAI छोटे किसान को फसल की फोटो से बीमारी जाँचने, सिंचाई का सही समय जानने, मौसम की चेतावनी पाने और अपनी उपज बेचने में मदद करता है – सरल हिंदी में, छूकर या बोलकर। यह बना हुआ है और डेमो डेटा पर जाँचा गया है। <b>हमारा अनुरोध: चूरू ज़िले में KVK और SHG के सहयोग से 4 सप्ताह का निगरानी वाला पायलट।</b>',
  prob_h='राजस्थान में समस्या',
  prob=[
   '2023-24 में देश के <b>45.40%</b> सरसों-राई और <b>14.66%</b> मोटे अनाज (नुट्री/कोर्स सीरियल्स) का उत्पादन राजस्थान में हुआ <span class="s">[S1]</span>। इन खेतों का नुकसान पूरे देश का नुकसान है।',
   '2022 के आकलन में राजस्थान की <b>302 में से 219</b> भूजल आकलन इकाइयाँ “अति-दोहित” थीं <span class="s">[S2]</span>। हर बेवजह की सिंचाई मायने रखती है।',
   'कीट और रोग हर साल दुनिया के फसल उत्पादन का <b>40% तक</b> नष्ट करते हैं <span class="s">[S3]</span>। जल्दी और सही पहचान से फ़र्क पड़ता है।',
   'विशेषज्ञ सलाह मौजूद है – राजस्थान में <b>47 कृषि विज्ञान केंद्र</b> हैं <span class="s">[S4]</span> – पर किसान को अक्सर खेत में, उसी दिन, अपनी भाषा में जवाब चाहिए।',
  ],
  sol_h='AgriAI क्या करता है',
  sol=[
   ('AI फसल सलाहकार', 'फोटो → समस्या, कारण, देसी उपाय, दवाई के generic नाम, सावधानी; आगे सवाल; 🔊 पढ़कर सुनाना।'),
   ('खेती की सलाह', 'मौसम चेतावनी (लू, पाला, बारिश, सूखा), फसल की अवस्था के हिसाब से पानी, फसल कैलेंडर – लिखे हुए नियम, “KVK से जाँचें” चिह्न के साथ।'),
   ('बाज़ार और सुविधाएँ', 'फोटो + आवाज़ से बिक्री, ऑर्डर, डिलीवरी ट्रैकिंग लिंक, साथ में मंडी, मशीन किराया, आधिकारिक लिंक के साथ योजनाओं की जानकारी।'),
   ('SHG संयोजक', 'गाँव की SHG दीदी विक्रेता सत्यापित करती है, न पढ़ पाने वालों की मदद, 48 घंटे में शिकायत निपटान, मंडी गाड़ी; पायलट डैशबोर्ड।'),
  ],
  shots=[('result-problem','फोटो जाँच: असली AI का जवाब (रिकॉर्ड किया)'),('water','फसल की अवस्था से पानी की सलाह'),('sell-ai-draft','बिक्री: AI फ़ॉर्म भरता है'),('admin-pilot','पायलट डैशबोर्ड: केवल गिनती')],
  safety_h='सुरक्षा पहले',
  safety=[
   '<b>अंदाज़ा नहीं लगाता:</b> फोटो साफ़ न हो, पौधा न हो या AI को भरोसा कम हो तो ऐप नई फोटो माँगता है – कोई जवाब नहीं दिखाता।',
   '<b>प्रतिबंधित दवाई सूची:</b> AI के बाद सर्वर पर जाँच से प्रतिबंधित/सीमित कीटनाशक हटाए जाते हैं; सिर्फ़ generic नाम, कभी सटीक मात्रा नहीं।',
   '<b>हर जवाब में KVK की सलाह:</b> “पक्का करने के लिए नज़दीकी कृषि विज्ञान केंद्र से सलाह लें”।',
   '<b>सटीकता:</b> खेत की असली फोटो पर अभी नहीं मापी गई। पायलट से पहले KVK विशेषज्ञ द्वारा 100 लेबल वाली फोटो की समीक्षा की योजना है (मानक: ≥70% सही, अस्पष्ट फोटो 100% अस्वीकार, प्रतिबंधित दवाई 0)।',
  ],
  priv_h='डेटा गोपनीयता',
  priv=[
   'AI को <b>केवल फोटो और फसल का नाम</b> जाता है – कभी नाम, फ़ोन नंबर या स्थान नहीं (स्वचालित टेस्ट से जाँचा)। जाँच की फोटो सहेजी नहीं जाती।',
   'सरल हिंदी में सहमति स्क्रीन (पढ़कर सुनाने के साथ); <b>“मेरा डेटा”</b> से किसान अपना डेटा डाउनलोड या तुरंत मिटा सकता है; संयोजक के हर काम का न बदलने वाला ऑडिट लॉग; एन्क्रिप्टेड बैकअप 14 दिन।',
   'DPDP अधिनियम, 2023 और DPDP नियम, 2025 (14 नवंबर 2025 को अधिसूचित, 18 माह की चरणबद्ध अनुपालन अवधि) को ध्यान में रखकर बनाया गया <span class="s">[S5]</span>। नीति और शर्तें अभी मसौदा हैं – कानूनी समीक्षा बाकी।',
  ],
  gov_h='मौजूदा सरकारी प्रयासों में कैसे सहायक हो सकता है',
  gov=[
   '<b>KVK:</b> हर जवाब किसान को KVK की ओर भेजता है; सभी नियम KVK विशेषज्ञ जाँच और सुधार सकते हैं।',
   '<b>SHG (जैसे राजीविका समूह):</b> गाँव संयोजक के रूप में SHG सदस्यों की स्पष्ट भूमिका (मानदेय SHG के साथ तय होगा)।',
   '<b>योजनाएँ:</b> सरल हिंदी में योजना की जानकारी, आधिकारिक वेबसाइट के लिंक के साथ; आवेदन प्रक्रिया नहीं करता।',
   '<b>सार्वजनिक डेटा:</b> data.gov.in से मंडी भाव दिखा सकता है। <i>आज कोई आधिकारिक साझेदारी नहीं है।</i>',
  ],
  status_h='सही स्थिति',
  status=[
   ('built','बना हुआ और काम करता है','फोटो जाँच, चैट, आवाज़, मौसम/पानी/कैलेंडर, बाज़ार, डिलीवरी लिंक, शिकायत, साथ में मंडी, किराया, योजनाएँ, संयोजक पैनल, सहमति और “मेरा डेटा”, ऑफ़लाइन डेमो मोड।'),
   ('tested','डेमो डेटा पर जाँचा गया','566 सर्वर टेस्ट, 146 ऐप टेस्ट, 8 एंड-टू-एंड फ़ोन यात्राएँ (सुगम्यता सहित); खुले लाइसेंस वाली रोग-फोटो पर असली AI जवाब रिकॉर्ड।'),
   ('planned','योजना / पायलट में देखना है','KVK सटीकता समीक्षा, क्लाउड पर तैनाती, कानूनी समीक्षा, असली किसान और SHG, उपज या आय पर असर (दावा नहीं)।'),
  ],
  cost_h='चलाने का खर्च (अनुमान)',
  cost=[('होस्टिंग (Render Starter)','$7 / माह','[S10]'),('डेटाबेस (MongoDB Atlas)','$0 (मुफ़्त, 512 MB) – $8 / माह','[S8]'),('AI (Gemini 3.8 Flash)','≈ $8 प्रति 1,000 फोटो जाँच*','[S6]'),('पायलट का एक माह, 50 किसान','≈ $15–32 (≈ ₹1,300–2,800)*','')],
  cost_note='*अनुमान: प्रति जाँच ≈3,500 इनपुट + 1,500 आउटपुट टोकन; 31 दिसंबर 2026 तक की दर (1 जनवरी 2027 से दुगनी); पायलट मुफ़्त टियर में भी आ सकता है; ₹88/$ माना। Render का मुफ़्त टियर उत्पादन के लिए नहीं है <span class="s">[S7]</span>।',
  ask_h='हमारा अनुरोध',
  ask=[
   '<b>चूरू ज़िले में 4 सप्ताह का निगरानी वाला पायलट</b> – 20–50 किसान, 2–3 SHG समूह – की अनुमति।',
   '<b>चूरू KVK के एक विशेषज्ञ का समय:</b> पायलट से पहले 100 फोटो की समीक्षा और पायलट के दौरान नमूना जाँच।',
   'संयोजक बनने के इच्छुक <b>2–3 SHG समूहों</b> से परिचय।',
   'हम साप्ताहिक नतीजे और पहले से तय रोकने/जारी रखने के नियम ज़िला प्रशासन से साझा करेंगे। <b>पायलट के लिए कोई राशि नहीं माँग रहे।</b>',
  ],
  contact='संपर्क: Fisto Up · [नाम] · [फ़ोन] · [ईमेल]',
  src='स्रोत: [S1] आर्थिक समीक्षा 2023-24, सांख्यिकी परिशिष्ट तालिका 1.18 · [S2] PIB, जल शक्ति मंत्रालय, 8 दिसं 2022 · [S3] FAO, 2 जून 2021 · [S4] ICAR KVK सूची · [S5] PIB, MeitY, 14 नवं 2025 · [S6] Gemini API मूल्य · [S7] Render docs · [S8] MongoDB Atlas मूल्य · [S10] Render, मई 2026. लिंक: showcase/SOURCES.md',
 ),
}

def page(t):
    li = lambda xs: ''.join(f'<li>{x}</li>' for x in xs)
    sol = ''.join(f'<div class="card green"><h3>{a}</h3><p>{b}</p></div>' for a, b in t['sol'])
    shots = ''.join(f'<div><div class="phone"><img src="../assets/shots/{f}.png" alt=""></div><p class="cap">{c}</p></div>' for f, c in t['shots'])
    status = ''.join(f'<tr><td style="width:30%"><span class="pill {k}">{a}</span></td><td>{b}</td></tr>' for k, a, b in t['status'])
    cost = ''.join(f'<tr><td>{a}</td><td><b>{b}</b></td><td class="s">{c}</td></tr>' for a, b, c in t['cost'])
    return f'''<!doctype html>
<html lang="{t['lang']}"><head><meta charset="utf-8"><title>{t['title']}</title>
<link rel="stylesheet" href="../assets/showcase.css">
<style>
 body {{ font-size: 9.6pt; line-height: 1.42; }} h1 {{ font-size: 19pt; }} h2 {{ font-size: 11.5pt; margin: 3.2mm 0 1.4mm; }}
 .lede {{ font-size: 10.6pt; }} li {{ margin-bottom: 0.8mm; }} .s {{ color: var(--muted); font-size: 7.6pt; white-space: nowrap; }}
 .grid4 {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }} .card p {{ margin: 0; font-size: 8.9pt; }} .card h3 {{ font-size: 10pt; }}
 .shots {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 3mm; }}
 .phone {{ height: 84mm; }} .phone img {{ height: 100%; width: 100%; object-fit: cover; object-position: top; }}
 .ask li {{ margin-bottom: 1.2mm; }} .page {{ height: 268mm; }}
</style></head><body>
<section class="page">
<div class="brandbar"><div class="logo">A</div><div class="name">AgriAI · Fisto Up</div><div class="tag">{t['tag']}</div></div>
<h1>{t['h1']}</h1>
<p class="lede">{t['lede']}</p>
<h2>{t['prob_h']}</h2><ul>{li(t['prob'])}</ul>
<h2>{t['sol_h']}</h2><div class="grid4">{sol}</div>
<div class="shots">{shots}</div>
<div class="foot"><span>{t['contact']}</span><span>1 / 2</span></div>
</section>
<section class="page">
<div class="grid2">
<div><h2 style="margin-top:0">{t['safety_h']}</h2><ul>{li(t['safety'])}</ul></div>
<div><h2 style="margin-top:0">{t['priv_h']}</h2><ul>{li(t['priv'])}</ul></div>
</div>
<h2>{t['gov_h']}</h2><ul>{li(t['gov'])}</ul>
<div class="grid2">
<div><h2>{t['status_h']}</h2><table>{status}</table></div>
<div><h2>{t['cost_h']}</h2><table>{cost}</table><p class="small">{t['cost_note']}</p></div>
</div>
<div class="ask"><h2>{t['ask_h']}</h2><ol>{li(t['ask'])}</ol></div>
<p class="src" style="margin-top:3mm">{t['src']}</p>
<div class="foot"><span>{t['contact']}</span><span>2 / 2</span></div>
</section>
</body></html>'''

for key, t in T.items():
    open(f'brief-{key}.html', 'w').write(page(t))
print('ok')
