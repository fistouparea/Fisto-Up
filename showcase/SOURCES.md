# Sources used in the Showcase Kit

Every number in the brief, deck and Q&A comes from this list (checked on 6 Nov 2026). If a number is not here, it is not
used. Numbers about AgriAI itself come from this repository (tests, code) and are marked "built", "tested with demo data"
or "planned / needs pilot".

| # | Source (publisher, year) | What we use | Link |
| --- | --- | --- | --- |
| S1 | Economic Survey 2023-24, Statistical Appendix, Table 1.18 (Ministry of Finance, 2024) | Rajasthan produced **45.40%** of India's rapeseed & mustard and **14.66%** of India's nutri/coarse cereals in 2023-24 | https://indiabudget.gov.in/budget2024-25/economicsurvey/doc/stat/tab118.pdf |
| S2 | PIB, Ministry of Jal Shakti, "Dynamic Ground Water Resource Assessment Report", 8 Dec 2022 | Rajasthan: **219 of 302** groundwater assessment units over-exploited (**72.52%**), 2022 assessment | https://pib.gov.in/PressReleasePage.aspx?PRID=1881811 |
| S3 | FAO, "Climate change fans spread of pests and threatens plants and crops, new FAO study", 2 Jun 2021 | "Up to **40 percent** of global crop production is lost to pests" each year | https://www.fao.org/newsroom/detail/Climate-change-fans-spread-of-pests-and-threatens-plants-and-crops-new-FAO-study/en |
| S4 | ICAR, "Krishi Vigyan Kendras" (list by state; page updated 2026) | Rajasthan has **47 KVKs** (ICAR-ATARI Zone II, Jodhpur) | https://icar.org.in/en/krishi-vigyan-kendras |
| S5 | PIB, MeitY, "Government notifies DPDP Rules to empower citizens and protect privacy", 14 Nov 2025 | DPDP Rules 2025 notified; DPDP Act 2023 fully operational; **18-month** phased compliance; rights to access, correct, erase; requests answered within **90 days**; plain-language breach notices | https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014 |
| S6 | Google, Gemini API pricing (page read 6 Nov 2026) | Gemini 3.8 Flash: **$0.75** per 1M input tokens and **$3.75** per 1M output tokens until 31 Dec 2026 (**$1.50 / $7.50** from 1 Jan 2027); a free tier exists | https://aistudio.google.com/docs/pricing |
| S7 | Render, "Deploy for free" docs (read 6 Nov 2026) | Free web services sleep after 15 min idle, 750 free hours/month, "Do not use them for production applications" | https://render.com/docs/free |
| S8 | MongoDB, Atlas pricing (read 6 Nov 2026) | M0 free cluster: 512 MB, $0; Flex tier from **$8/month** (up to $30) | https://www.mongodb.com/pricing |
| S10 | Render, "Render vs Railway" (Render's own article, 6 May 2026) | Render Starter instance **$7/month** (0.5 vCPU, 512 MB); Standard $25/month | https://render.com/articles/render-vs-railway |
| S9 | Wikimedia Commons (demo photos only) | Openly licensed crop-disease photos used in the demo and video (CC0 / CC BY-SA 4.0) | backend/demo/photos/ATTRIBUTION.md |

## Assumptions (marked as estimates wherever used)
- Exchange rate ₹88 per US$ (assumption for rough rupee figures; check the day's rate).
- One photo check ≈ 3,500 input tokens (prompt + one shrunk photo) and ≈ 1,500 output tokens (answer + "thinking").
  Not measured on the live API yet; the real bill will confirm it.

## Claims we deliberately do NOT make
- No AI accuracy number: there are no `/eval` reports yet (no labelled field photos). Say: "KVK review planned before pilot".
- No yield, income or savings numbers for farmers: not measured yet. The pilot measures them (see pilot plan).
- No user numbers: the app has not had real users yet.
- No official partnership with any government body, KVK, SHG federation or scheme.
