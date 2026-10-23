/** WhatsApp share link (free, no API): opens WhatsApp with the text ready to send to any contact. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Full link to a listing, so it opens the app on the listing page. */
export function listingLink(origin: string, listingId: string): string {
  return `${origin}/#/market/listing/${encodeURIComponent(listingId)}`;
}
