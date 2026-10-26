/**
 * ⚠️ Sarkari Yojana data – needs regular checking by a coordinator. Rules for this file:
 * - Only facts we could read on an official government site go in. Anything not checked is left OUT
 *   (no amounts, eligibility, documents or helplines from memory) and the scheme has status "verify".
 * - `last_verified` is the date someone read `source_url`; null = never checked.
 * - Coordinators can correct and complete schemes in the panel (stored in MongoDB, audited); this is the default.
 * Checked on 2026-10-26: pmkisan.gov.in (benefit sentence), rajkisan.rajasthan.gov.in (list of services).
 * pmfby.gov.in and soilhealth.dac.gov.in did not show their text to our check, so those stay "verify".
 */
import type { IrrigationSource } from '../types/farm.js';

export const SCHEME_LEVELS = ['central', 'rajasthan'] as const;
export type SchemeLevel = (typeof SCHEME_LEVELS)[number];
export const SCHEME_STATUSES = ['verified', 'verify'] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

/**
 * Simple hints from the farm profile, never a decision: "may be for you" only. The farmer always checks on the
 * official site / e-Mitra.
 */
export interface SchemeHint {
  /** Shown when the farm profile has crops (the farmer farms land). */
  farmsLand?: string;
  /** Shown when the field's water source is one of these. */
  irrigation?: { sources: readonly IrrigationSource[]; text: string };
}

export interface SchemeData {
  id: string;
  level: SchemeLevel;
  name: string;
  /** Simple Hindi: what the scheme is about. */
  summary: string;
  /** Who can apply, only as written on the official source. Empty = not checked yet. */
  whoCanApply: string[];
  documents: string[];
  officialLink: string;
  helpline: string | null;
  source_url: string;
  /** YYYY-MM-DD */
  last_verified: string | null;
  status: SchemeStatus;
  hint: SchemeHint;
}

export const SCHEMES: SchemeData[] = [
  {
    id: 'pm_kisan',
    level: 'central',
    name: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)',
    summary: 'ज़मीन वाले किसान परिवारों को सरकार साल में ₹6,000 देती है, तीन बराबर किस्तों में, सीधे बैंक खाते में।',
    whoCanApply: ['ज़मीन वाले किसान परिवार (आधिकारिक साइट पर बाहर रखे गए लोगों की सूची देखें)'],
    documents: [],
    officialLink: 'https://pmkisan.gov.in/',
    helpline: null,
    source_url: 'https://pmkisan.gov.in/',
    last_verified: '2026-10-26',
    status: 'verified',
    hint: { farmsLand: 'आपने खेत की फसल भरी है: अगर ज़मीन आपके परिवार के नाम है तो यह योजना आपके लिए हो सकती है।' },
  },
  {
    id: 'pmfby',
    level: 'central',
    name: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
    summary: 'फसल बीमा: मौसम, सूखा, कीट या बीमारी से फसल खराब होने पर बीमा का पैसा मिल सकता है।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://pmfby.gov.in/',
    helpline: null,
    source_url: 'https://pmfby.gov.in/',
    last_verified: null,
    status: 'verify',
    hint: { farmsLand: 'आप फसल उगाते हैं: बुवाई के मौसम में बीमा की आखिरी तारीख पता करें।' },
  },
  {
    id: 'kcc',
    level: 'central',
    name: 'किसान क्रेडिट कार्ड (KCC)',
    summary: 'खेती के खर्च (बीज, खाद, दवाई) के लिए बैंक से कम ब्याज पर कर्ज़ का कार्ड। पशुपालन के लिए भी।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://rajkisan.rajasthan.gov.in/',
    helpline: null,
    source_url: 'https://rajkisan.rajasthan.gov.in/',
    last_verified: '2026-10-26',
    status: 'verify',
    hint: { farmsLand: 'खेती के खर्च के लिए अपने बैंक या ई-मित्र पर KCC के बारे में पूछें।' },
  },
  {
    id: 'soil_health_card',
    level: 'central',
    name: 'मृदा स्वास्थ्य कार्ड (Soil Health Card)',
    summary: 'खेत की मिट्टी की जाँच। कार्ड पर लिखा होता है कि मिट्टी में क्या कम है और कौन-सी खाद कितनी चाहिए।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://soilhealth.dac.gov.in/',
    helpline: null,
    source_url: 'https://soilhealth.dac.gov.in/',
    last_verified: null,
    status: 'verify',
    hint: { farmsLand: 'मिट्टी की जाँच से खाद का पैसा बच सकता है। पास की मिट्टी जाँच लैब/कृषि पर्यवेक्षक से पूछें।' },
  },
  {
    id: 'raj_tarbandi',
    level: 'rajasthan',
    name: 'खेतों की तारबंदी (राजस्थान)',
    summary: 'नीलगाय और आवारा पशुओं से फसल बचाने के लिए खेत की तारबंदी में सरकारी मदद। राज किसान साथी पोर्टल पर आवेदन।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://rajkisan.rajasthan.gov.in/',
    helpline: null,
    source_url: 'https://rajkisan.rajasthan.gov.in/',
    last_verified: '2026-10-26',
    status: 'verify',
    hint: { farmsLand: 'आप खेती करते हैं: तारबंदी की शर्तें राज किसान साथी या ई-मित्र पर देखें।' },
  },
  {
    id: 'raj_khet_talai',
    level: 'rajasthan',
    name: 'खेत तलाई / डिग्गी (राजस्थान)',
    summary: 'बारिश का पानी जमा करने के लिए खेत तलाई और सिंचाई के पानी के लिए डिग्गी बनाने में सरकारी मदद।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://rajkisan.rajasthan.gov.in/',
    helpline: null,
    source_url: 'https://rajkisan.rajasthan.gov.in/',
    last_verified: '2026-10-26',
    status: 'verify',
    hint: { irrigation: { sources: ['rainfed', 'tanka', 'canal'], text: 'आपका खेत बारिश/नहर/टांके पर है: पानी जमा करने के लिए यह योजना काम की हो सकती है।' } },
  },
  {
    id: 'raj_sprinkler_drip',
    level: 'rajasthan',
    name: 'फव्वारा (स्प्रिंकलर) / बूंद-बूंद (ड्रिप) सिंचाई (राजस्थान)',
    summary: 'कम पानी में सिंचाई के लिए स्प्रिंकलर, ड्रिप, रेन गन लगाने में उद्यान विभाग की मदद।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://rajkisan.rajasthan.gov.in/',
    helpline: null,
    source_url: 'https://rajkisan.rajasthan.gov.in/',
    last_verified: '2026-10-26',
    status: 'verify',
    hint: { irrigation: { sources: ['tubewell', 'canal'], text: 'आपके पास ट्यूबवेल/नहर का पानी है: फव्वारा या ड्रिप से पानी बच सकता है।' } },
  },
  {
    id: 'raj_pipeline',
    level: 'rajasthan',
    name: 'सिंचाई पाइपलाइन (राजस्थान)',
    summary: 'कुएँ/ट्यूबवेल से खेत तक पानी ले जाने की पाइपलाइन के लिए सरकारी मदद।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://rajkisan.rajasthan.gov.in/',
    helpline: null,
    source_url: 'https://rajkisan.rajasthan.gov.in/',
    last_verified: '2026-10-26',
    status: 'verify',
    hint: { irrigation: { sources: ['tubewell'], text: 'आपके पास ट्यूबवेल है: पाइपलाइन से पानी बर्बाद होना कम होता है।' } },
  },
  {
    id: 'pm_kusum',
    level: 'central',
    name: 'सोलर पंप (PM-KUSUM / राज किसान साथी)',
    summary: 'सिंचाई के लिए सोलर पंप लगाने में सरकारी मदद, ताकि डीज़ल/बिजली का खर्च कम हो।',
    whoCanApply: [],
    documents: [],
    officialLink: 'https://rajkisan.rajasthan.gov.in/',
    helpline: null,
    source_url: 'https://rajkisan.rajasthan.gov.in/',
    last_verified: '2026-10-26',
    status: 'verify',
    hint: { irrigation: { sources: ['tubewell'], text: 'ट्यूबवेल के लिए सोलर पंप से बिजली/डीज़ल का खर्च बच सकता है।' } },
  },
];

/** Always shown with every scheme and hint. */
export const SCHEME_CHECK_LINE = 'पक्का करने के लिए आधिकारिक साइट/ई-मित्र पर जाँचें।';
