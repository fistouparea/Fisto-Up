import type { ChatMessage } from '../../types/chat.js';
import type { AiDiagnosis, Diagnosis, ImageMimeType } from '../../types/diagnosis.js';
import type { AiListingDraft } from '../../modules/listings/listing.types.js';

export interface DiagnoseInput {
  image: Buffer;
  mimeType: ImageMimeType;
  /** Crop name as chosen by the farmer. This and the image are the only data sent to the AI. */
  cropName: string;
}

export interface ChatInput {
  cropName: string;
  /** The earlier diagnosis this conversation is about. The image is not resent. */
  diagnosis: Diagnosis;
  /** Recent chat history; the last message is the farmer's new question. */
  messages: ChatMessage[];
}

export interface ListingDraftInput {
  /** Product photo (shrunk on the phone, no GPS data). */
  image: Buffer;
  mimeType: ImageMimeType;
  /** What the seller said or typed, with phone numbers removed. Nothing else about the seller is sent. */
  sellerText: string;
}

/**
 * Any AI service that can diagnose a crop photo and answer follow-up questions.
 * Implementations must return validated data or throw an AppError
 * (RATE_LIMITED, AI_TIMEOUT or AI_ERROR).
 */
export interface AiProvider {
  diagnose(input: DiagnoseInput): Promise<AiDiagnosis>;
  /** Returns a short answer in simple Hindi. */
  chat(input: ChatInput): Promise<string>;
  /** "Snap & List": suggests a listing from a product photo and the seller's words. */
  draftListing(input: ListingDraftInput): Promise<AiListingDraft>;
}
