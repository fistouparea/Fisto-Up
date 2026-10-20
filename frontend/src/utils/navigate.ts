/** Hash navigation (see hooks/useHashRoute.ts). Kept outside components so React rules stay happy. */
export function navigateTo(hash: string): void {
  window.location.hash = hash;
}
