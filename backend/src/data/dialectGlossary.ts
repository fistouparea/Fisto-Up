/**
 * ⚠️ DRAFT – needs review by a local speaker (Churu: Marwari / Shekhawati).
 * Common dialect words in farmers' spoken or typed questions → Hindi meaning. Sent to the AI (chat and voice
 * commands) so it understands them; never used to change medicine advice.
 */
export const DIALECT_GLOSSARY: readonly { word: string; hindi: string }[] = [
  { word: 'मेह / मेंह', hindi: 'बारिश' },
  { word: 'पाणी', hindi: 'पानी' },
  { word: 'बायरो', hindi: 'हवा' },
  { word: 'आंधी / भतूळियो', hindi: 'आँधी / बवंडर' },
  { word: 'तावड़ो', hindi: 'धूप / गर्मी' },
  { word: 'पाळो', hindi: 'पाला' },
  { word: 'धूंवर', hindi: 'कोहरा' },
  { word: 'आभो', hindi: 'आसमान' },
  { word: 'खेत / खेतड़ो', hindi: 'खेत' },
  { word: 'बीघो', hindi: 'बीघा' },
  { word: 'टांको / कुंड', hindi: 'पानी जमा करने का पक्का गड्ढा' },
  { word: 'बाजरी', hindi: 'बाजरा' },
  { word: 'ग्वार / गुवार', hindi: 'ग्वार' },
  { word: 'मोठ', hindi: 'मोठ (दाल)' },
  { word: 'सिरस्यूं / सरस्यूं', hindi: 'सरसों' },
  { word: 'जीरो', hindi: 'जीरा' },
  { word: 'गोहूं / गेऊं', hindi: 'गेहूं' },
  { word: 'चणा', hindi: 'चना' },
  { word: 'पत्ता / पान', hindi: 'पत्ते' },
  { word: 'जड़', hindi: 'जड़' },
  { word: 'दाणो', hindi: 'दाना' },
  { word: 'सिट्टो', hindi: 'बाजरे की बाली' },
  { word: 'फळी', hindi: 'फली' },
  { word: 'लट', hindi: 'सुंडी / इल्ली (कीड़ा)' },
  { word: 'मोलो / माहू', hindi: 'माहू (चेपा) कीड़ा' },
  { word: 'उखेड़ / उकठो', hindi: 'उकठा (पौधा सूखना)' },
  { word: 'पीळो पड़णो', hindi: 'पीला पड़ना' },
  { word: 'सूखणो', hindi: 'सूखना' },
  { word: 'बळणो', hindi: 'झुलसना / जलना' },
  { word: 'खाद / खात', hindi: 'खाद' },
  { word: 'छिड़काव / छांटो', hindi: 'छिड़काव' },
  { word: 'बुवाई / बीजणो', hindi: 'बुवाई' },
  { word: 'लावणी / काटणी', hindi: 'कटाई' },
  { word: 'निनाण / निदाण', hindi: 'निराई (खरपतवार निकालना)' },
  { word: 'कांई', hindi: 'क्या' },
  { word: 'कठे / कठै', hindi: 'कहाँ' },
  { word: 'कद', hindi: 'कब' },
  { word: 'कित्तो / कितरो', hindi: 'कितना' },
  { word: 'कोनी', hindi: 'नहीं' },
  { word: 'म्हारो / म्हारी', hindi: 'मेरा / मेरी' },
  { word: 'थारो / थारी', hindi: 'तुम्हारा / तुम्हारी' },
  { word: 'घणो', hindi: 'बहुत' },
  { word: 'चोखो', hindi: 'अच्छा' },
  { word: 'करसो / किरसाण', hindi: 'किसान' },
];

/** One line per word for the AI prompt. */
export function glossaryForPrompt(): string {
  return DIALECT_GLOSSARY.map(({ word, hindi }) => `   - ${word} = ${hindi}`).join('\n');
}
