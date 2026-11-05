/**
 * How many sticky action bars (StickyActions) are on screen. The floating 🎤 moves above them, so it never
 * covers a screen's main button ("लिस्टिंग डालें", "जाँच करें", ...).
 */
let count = 0;
const listeners = new Set<() => void>();

export function stickyActionsShown(): () => void {
  count += 1;
  listeners.forEach((listener) => listener());
  return () => {
    count -= 1;
    listeners.forEach((listener) => listener());
  };
}

export function hasStickyActions(): boolean {
  return count > 0;
}

export function subscribeStickyActions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
