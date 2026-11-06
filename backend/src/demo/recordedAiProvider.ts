import { AppError } from '../errors/AppError.js';
import type { AiProvider, ChatInput, DiagnoseInput, ListingDraftInput } from '../services/ai/aiProvider.js';
import type { AiDiagnosis } from '../types/diagnosis.js';
import type { AiListingDraft } from '../modules/listings/listing.types.js';
import type { AiPriceEstimate } from '../modules/pricing/pricing.types.js';
import type { Unit } from '../config/marketCatalog.js';
import type { VoiceIntentId } from '../config/voiceIntents.js';
import { aspectOf, normalizeText, sameShape, type Recordings } from './recordings.js';

/** A photo that was not recorded: low confidence, so the app shows "फोटो साफ नहीं" and never a guess. */
const NOT_RECORDED: AiDiagnosis = { is_plant_image: true, confidence: 'low', problem_name: '', explanation: '', desi_upay: [], dawai: [], savdhani: [] };

export const DEMO_CHAT_NOT_RECORDED = 'डेमो मोड: इस सवाल का जवाब रिकॉर्ड नहीं है। असली ऐप में यहाँ AI जवाब देता है। कृपया सुझाए गए सवाल पूछें।';

/**
 * Offline demo: replays saved real AI answers (demo/recordings.json) for the demo photos and questions,
 * so a demo works without internet. Only DEMO_MODE turns it on, and it refuses to exist in production.
 */
export class RecordedAiProvider implements AiProvider {
  constructor(
    private readonly recordings: Recordings,
    nodeEnv: string | undefined = process.env.NODE_ENV,
  ) {
    if (nodeEnv === 'production') throw new Error('RecordedAiProvider (DEMO_MODE) can never run in production');
  }

  async diagnose(input: DiagnoseInput): Promise<AiDiagnosis> {
    const aspect = aspectOf(input.image);
    const match = aspect === null ? undefined : this.recordings.diagnoses.find((item) => item.cropName === input.cropName && sameShape(aspect, item.aspect));
    return match?.response ?? NOT_RECORDED;
  }

  async chat(input: ChatInput): Promise<string> {
    const question = normalizeText(input.messages.at(-1)?.text ?? '');
    const language = input.answerLanguage ?? 'hi';
    const match = this.recordings.chats.find((item) => item.cropName === input.cropName && item.answerLanguage === language && normalizeText(item.question) === question);
    return match?.answer ?? DEMO_CHAT_NOT_RECORDED;
  }

  async draftListing(input: ListingDraftInput): Promise<AiListingDraft> {
    const aspect = aspectOf(input.image);
    const text = normalizeText(input.sellerText);
    const match = this.recordings.listingDrafts.find((item) => normalizeText(item.sellerText) === text && aspect !== null && sameShape(aspect, item.aspect));
    // Not recorded: the same as an AI failure, so the seller fills the form by hand.
    if (!match) throw new AppError('AI_ERROR', 'Demo mode: this photo and text were not recorded');
    return match.response;
  }

  async estimatePrice(input: { productName: string; unit: Unit }): Promise<AiPriceEstimate> {
    const match = this.recordings.prices.find((item) => item.productName === input.productName && item.unit === input.unit);
    if (!match) throw new AppError('AI_ERROR', 'Demo mode: this price was not recorded');
    return match.response;
  }

  async classifyIntent(input: { text: string }): Promise<{ intent: VoiceIntentId | null }> {
    const text = normalizeText(input.text);
    return { intent: this.recordings.intents.find((item) => normalizeText(item.text) === text)?.intent ?? null };
  }
}
