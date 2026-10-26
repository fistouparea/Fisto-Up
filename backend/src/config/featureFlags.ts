/**
 * Feature flags: switch features on for pilot users first, then for everyone. A coordinator can change the
 * state in the panel (stored in MongoDB, audited); these are the defaults until then.
 *   off   – nobody
 *   pilot – coordinators and pilot accounts (signed up with an invite code, or created by a coordinator)
 *   all   – everyone, also farmers without an account
 */
export const FLAG_STATES = ['off', 'pilot', 'all'] as const;
export type FlagState = (typeof FLAG_STATES)[number];

export const FEATURE_FLAGS = {
  /** Sign-up needs an invite code. Only off/all matter here (a new account is not a pilot account yet). */
  inviteOnly: { default: 'off', description: 'नया खाता सिर्फ़ इनवाइट कोड से (पायलट)' },
  aiFeedback: { default: 'all', description: 'हर जाँच के बाद "क्या जवाब सही था?" 👍 / 👎' },
  helpRequests: { default: 'all', description: '"मदद/शिकायत" बटन' },
  voiceInput: { default: 'all', description: 'फीडबैक और शिकायत बोलकर लिखना (🎤)' },
  pilotDashboard: { default: 'pilot', description: 'संयोजक का पायलट डैशबोर्ड' },
  // Phase 5: every new feature starts with pilot users only.
  voiceMode: { default: 'pilot', description: 'बोलकर चलाएँ: हर स्क्रीन पर बड़ा माइक, और "पढ़कर सुनाएँ"' },
  languages: { default: 'pilot', description: 'भाषा चुनें (हिंदी / English / राजस्थानी) और "जवाब राजस्थानी में"' },
  schemes: { default: 'pilot', description: 'सरकारी योजनाएँ: "मेरे लिए योजनाएँ"' },
  aiKit: { default: 'pilot', description: 'जाँच के बाद "ज़रूरी सामान" और खाद-बीज-दवाई की साझेदार दुकानें' },
} as const satisfies Record<string, { default: FlagState; description: string }>;

export type FlagKey = keyof typeof FEATURE_FLAGS;
export const FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FlagKey[];

/** Defaults with the env override: INVITE_ONLY=true turns invite-only sign-up on from the start. */
export function flagDefaults(inviteOnly: boolean | undefined): Record<FlagKey, FlagState> {
  const defaults = Object.fromEntries(FLAG_KEYS.map((key) => [key, FEATURE_FLAGS[key].default])) as Record<FlagKey, FlagState>;
  if (inviteOnly !== undefined) defaults.inviteOnly = inviteOnly ? 'all' : 'off';
  return defaults;
}
