/** Longest text read aloud for one screen (about 30 seconds of speech). */
const MAX_LENGTH = 450;

/**
 * The main content of a screen for "पढ़कर सुनाएँ": an element marked `data-read-aloud` if the screen has one,
 * else the heading and the first lines of text. Buttons, navigation and hidden text are skipped.
 */
export function screenText(main: Element | null): string {
  if (!main) return '';
  const marked = main.querySelector('[data-read-aloud]');
  const parts = marked ? [marked.textContent ?? ''] : [...main.querySelectorAll('h1, h2, h3, p')].filter((node) => !node.closest('button, nav, [aria-hidden="true"], .sr-only')).map((node) => node.textContent ?? '');
  return speechFromParts(parts);
}

/** Joins text pieces into one sentence list and cuts it at a word or sentence end near MAX_LENGTH. */
export function speechFromParts(parts: string[]): string {
  const text = parts.map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean).join('। ');
  if (text.length <= MAX_LENGTH) return text;
  const cut = text.slice(0, MAX_LENGTH);
  return cut.slice(0, Math.max(cut.lastIndexOf('।'), cut.lastIndexOf(' '))).trim();
}
