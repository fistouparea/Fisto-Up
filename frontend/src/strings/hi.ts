import type { CropId, ErrorCode } from '../api/types';

/** All Hindi text shown in the app lives here. */
export const hi = {
  appName: 'AgriAI',
  appTagline: 'फसल की फोटो से बीमारी और इलाज जानें',

  chooseCrop: 'आपकी फसल कौन सी है?',
  selectedCrop: 'फसल',
  changeCrop: 'बदलें',

  takePhotoHint: 'बीमार पत्ते या पौधे की पास से साफ फोटो लें',
  takePhoto: 'फोटो लें',
  chooseFromGallery: 'गैलरी से चुनें',
  preparingPhoto: 'फोटो तैयार हो रही है...',

  checkPhoto: 'जाँच करें',
  retakePhoto: 'दूसरी फोटो लें',
  checking: 'जाँच हो रही है...',
  checkingHint: 'कृपया रुकें, इसमें थोड़ा समय लग सकता है',

  sections: {
    problem: 'समस्या',
    cause: 'कारण',
    desiUpay: 'देसी उपाय',
    dawai: 'दवाई',
    savdhani: 'सावधानी',
  },
  noDawaiNeeded: 'अभी किसी दवाई की ज़रूरत नहीं है।',
  kvkAdvice: 'पक्का करने के लिए अपने नज़दीकी कृषि विज्ञान केंद्र (KVK) से सलाह लें।',
  newCheck: 'नई जाँच करें',

  unclearPhoto: 'फोटो साफ नहीं है, कृपया पास से और रोशनी में दोबारा फोटो लें।',
  tryAgain: 'फिर से कोशिश करें',
} as const;

export const cropLabels: Record<CropId, { hindi: string; english: string; emoji: string }> = {
  bajra: { hindi: 'बाजरा', english: 'Bajra', emoji: '🌾' },
  guar: { hindi: 'ग्वार', english: 'Guar', emoji: '🫛' },
  moong: { hindi: 'मूंग', english: 'Moong', emoji: '🫘' },
  moth: { hindi: 'मोठ', english: 'Moth', emoji: '🫘' },
  chana: { hindi: 'चना', english: 'Chana', emoji: '🌰' },
  sarson: { hindi: 'सरसों', english: 'Mustard', emoji: '🌼' },
  jeera: { hindi: 'जीरा', english: 'Jeera', emoji: '🌿' },
  gehun: { hindi: 'गेहूं', english: 'Wheat', emoji: '🌾' },
  other: { hindi: 'अन्य', english: 'Other', emoji: '🌱' },
};

const SOMETHING_WENT_WRONG = 'कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।';
const PHOTO_NOT_OPENING = 'यह फोटो नहीं खुल रही। कृपया दूसरी फोटो लें।';

export const errorMessages: Record<ErrorCode, string> = {
  RATE_LIMITED: 'अभी बहुत लोग जाँच करवा रहे हैं, थोड़ी देर बाद कोशिश करें।',
  AI_TIMEOUT: 'जाँच में बहुत समय लग रहा है। थोड़ी देर बाद फिर से कोशिश करें।',
  NETWORK: 'इंटरनेट नहीं चल रहा। नेटवर्क देखकर फिर से कोशिश करें।',
  INVALID_IMAGE: PHOTO_NOT_OPENING,
  PHOTO_READ_FAILED: PHOTO_NOT_OPENING,
  FILE_TOO_LARGE: 'फोटो बहुत बड़ी है। कृपया दूसरी फोटो लें।',
  INVALID_INPUT: 'कृपया पहले फसल चुनें, फिर फोटो लें।',
  AI_ERROR: SOMETHING_WENT_WRONG,
  NOT_FOUND: SOMETHING_WENT_WRONG,
  INTERNAL: SOMETHING_WENT_WRONG,
  UNKNOWN: SOMETHING_WENT_WRONG,
};
