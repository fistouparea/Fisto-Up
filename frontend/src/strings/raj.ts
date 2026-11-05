import type { ErrorCode } from '../api/types';
import type { hiStrings } from './hi';
import type { hiFeatureStrings } from './hiFeatures';
import type { PartialText } from './live';

/**
 * ⚠️ DRAFT – NEEDS REVIEW BY A LOCAL SPEAKER (Marwari / Shekhawati, Churu).
 * Rajasthani for the farmer screens, drafted with AI help. Short words that farmers in Churu use; anything not
 * translated here shows in Hindi. Medicine names, numbers and safety texts (dawai warning, KVK) are kept close
 * to Hindi on purpose, so the safety meaning never changes. Please check every line with farmers before launch.
 */
export const rajApp: PartialText<typeof hiStrings & typeof hiFeatureStrings> = {
  appTagline: 'फसल री फोटू सूं बीमारी अर इलाज जाणो',
  nav: { label: 'मुख्य मेन्यू', home: 'घर', newCheck: 'जाँच', history: 'म्हारी जाँच', market: 'बजार' },
  steps: { label: 'जाँच रा कदम', crop: 'फसल चुणो', photo: 'फोटू लो', answer: 'जवाब' },
  severity: {
    title: 'हालत',
    healthy: 'चोखी',
    mild: 'ध्यान राखो',
    serious: 'गंभीर',
    healthyHint: 'फसल ठीक है',
    mildHint: 'जल्दी देखभाळ करो',
    seriousHint: 'आज ही इलाज करो',
  },
  toast: { resultReady: 'जाँच पूरी होगी' },
  back: 'पाछा',
  next: 'आगे',
  skip: 'छोड़ो',
  save: 'सेव करो',
  weather: {
    title: 'मौसम',
    today: 'आज',
    tomorrow: 'काल',
    next7: 'आगला 7 दिन',
    rainChance: 'मेह',
    wind: 'बायरो',
    needLocation: 'मौसम देखण सारू आपरै खेत री जगां भरो।',
    addLocation: 'जगां भरो',
    alertsTitle: 'सावधान',
    codes: { clear: 'साफ आभो', partlyCloudy: 'थोड़ा बादळ', cloudy: 'बादळ', fog: 'धूंवर', rain: 'मेह', heavyRain: 'जोर रो मेह', storm: 'आंधी' },
  },
  water: {
    title: 'पाणी री सलाह',
    status: { water_today: 'आज पाणी देवो', water_later: 'दिन पछै देवो', skip: 'आज पाणी मत देवो', check_soil: 'माटी देखो', rainfed: 'मेह रै भरोसै' },
    watered: 'आज पाणी दियो',
    wateredSaved: 'सेव होग्यो: आज पाणी दियो',
    tipsTitle: 'पाणी बचावण रा तरीका',
    noCrops: 'पाणी री सलाह सारू आपरी फसल भरो।',
    addCrops: 'फसल भरो',
  },
  calendar: { title: 'फसल कैलेंडर', todayWork: 'आज रो काम', noCrops: 'कैलेंडर सारू आपरी फसल भरो।' },
  notifications: { title: 'सूचना', empty: 'अबार कोई नुवीं सूचना कोनी।' },
  followUp: { question: 'कांई फसल ठीक होगी?', better: 'ठीक होगी', same: 'बियांई है', worse: 'और खराब' },
  home: {
    tiles: { schemes: 'सरकारी योजनावां', equipment: 'भाड़ै री मसीन', labour: 'मजूर / काम', livestock: 'पसु खरीदो-बेचो', mandiTrips: 'साथै मंडी' },
    greeting: 'राम राम सा',
    photoCheck: 'फोटू सूं जाँच',
    photoCheckHint: 'बीमार पौधै री फोटू लो',
    seeAll: 'पूरो देखो',
    fillFarm: 'आपरै खेत री जाणकारी भरो, पछै मौसम, पाणी अर काम री सलाह अठै दिखसी।',
  },
  mandi: { title: 'मंडी भाव' },
  offline: { banner: 'नेट कोनी, जूनी जाणकारी दिख री है', lastUpdate: 'छेहलो अपडेट' },
  farm: {
    title: 'म्हारो खेत',
    setupTitle: 'आपरै खेत रै बारे में बताओ',
    empty: 'आपरै खेत री जाणकारी भरो, पछै सही सलाह मिलसी।',
    fill: 'जाणकारी भरो',
    edit: 'बदळो',
    location: { question: 'आपरो खेत कठै है?', useGps: 'म्हारी जगां लो' },
    crops: { question: 'अबार खेत में कुणसी फसल है?', sownWhen: 'कद बोई?' },
    field: { sizeQuestion: 'खेत कित्तो बड़ो है?', irrigationQuestion: 'पाणी कठै सूं आवै?' },
  },
  history: { title: 'म्हारी जाँच', empty: 'अबार तांई कोई जाँच कोनी होई। फसल री फोटू लेय’र पैली जाँच करो।', loadMore: 'और देखो' },
  chooseCrop: 'आपरी फसल कुणसी है?',
  takePhotoHint: 'बीमार पत्तै या पौधै री नजीक सूं साफ फोटू लो',
  takePhoto: 'फोटू लो',
  checkPhoto: 'जाँच करो',
  retakePhoto: 'दूजी फोटू लो',
  checking: 'जाँच होय री है...',
  checkingHint: 'थोड़ो रुको सा, थोड़ो बगत लाग सकै',
  sections: { problem: 'दिक्कत', cause: 'कारण', desiUpay: 'देसी उपाय', dawai: 'दवाई', savdhani: 'सावधानी' },
  newCheck: 'नुवीं जाँच करो',
  chat: { title: 'और पूछो', placeholder: 'या अठै लिखो...', you: 'थे', micHint: 'बटन दबा’र बोलो', send: 'पूछो', waiting: 'जवाब आय रियो है...' },
  voice: { listen: 'सुणो', listenAll: 'पूरो सुणो', stop: 'रोको', speak: 'बोल’र पूछो', listening: 'बोलो सा...', notHeard: 'आवाज कोनी आई, पाछा बोलो' },
  voiceMode: {
    button: 'बोल’र चलाओ',
    sayHint: 'बोलो, जियां "मौसम बताओ"',
    opening: 'खोल रिया हां:',
    notUnderstood: 'माफ करो सा, बात समझ कोनी आई। नीचै सूं चुणो या पाछा बोलो।',
    failed: 'अबार बात समझ कोनी पा रिया। नीचै सूं चुणो।',
    youSaid: 'थे कह्यो',
    chooseTitle: 'कांई करणो है?',
    close: 'बंद करो',
    intents: { diagnose: 'फसल री जाँच', water: 'पाणी री सलाह', calendar: 'आज रो काम', sell: 'बेचो', buy: 'खरीदो', history: 'म्हारी जाँच', farm: 'म्हारो खेत', help: 'मदद', home: 'घर' },
  },
  settings: {
    title: 'सेटिंग',
    readAloud: 'पढ़’र सुणाओ',
    readAloudHint: 'चालू करण सूं हर नुवीं स्क्रीन री जरूरी बात आपै ई सुणाई जासी।',
    on: 'चालू',
    off: 'बंद',
    language: 'भासा',
    languageHint: 'ऐप कुणसी भासा में चलावणो है? बटन दबाओ।',
    rajasthaniAnswers: 'जवाब राजस्थानी में',
    rajasthaniAnswersHint: '"और पूछो" में AI रो जवाब मारवाड़ी में आसी।',
  },
  kit: {
    title: 'जरूरी सामान',
    intro: 'जाँच में बताई दवाई/खाद रा असली (generic) नाम। कोई भी दुकान सूं ओ ई नाम मांगो।',
    noProducts: 'नजीक री साझेदार दुकान में अबार कोनी मिल्यो। कोई भी दुकान सूं ओ नाम मांगो।',
    partner: 'साझेदार दुकान',
  },
  schemes: { title: 'म्हारै सारू योजनावां', homeButton: 'सरकारी योजनावां', checkOfficial: 'आ सिर्फ जाणकारी है। पक्को करण सारू आधिकारिक साइट/ई-मित्र पर देखो।' },
  services: {
    kinds: {
      equipment: { title: 'भाड़ै री मसीन', home: 'भाड़ै री मसीन' },
      labour: { title: 'मजूर', home: 'मजूर / काम' },
      livestock: { title: 'पसु', home: 'पसु खरीदो-बेचो' },
    },
    lookEverywhere: 'दूर रा भी देखो',
    request: 'बुकिंग मांगो',
    steps: { accepted: 'हां, मंजूर', rejected: 'ना, मना करो' },
  },
  mandiTrips: { title: 'साथै मंडी चालां', home: 'साथै मंडी', join: 'म्हारो माल भी ले चालो', leave: 'म्हैं कोनी जाऊं' },
  complaints: { title: 'म्हारी सिकायतां', raise: 'सिकायत करो', describe: 'कांई होयो? बोलो या लिखो' },
  tryAgain: 'पाछा कोसिस करो',
};

/** Only short, safe error texts are translated; the rest stay Hindi. */
export const rajErrors: Partial<Record<ErrorCode, string>> = {
  NETWORK: 'नेट कोनी चाल रियो। नेटवर्क देख’र पाछा कोसिस करो।',
  UNKNOWN: 'कीं गड़बड़ होगी। पाछा कोसिस करो।',
};
