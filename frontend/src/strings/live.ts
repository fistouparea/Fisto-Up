/**
 * Language switching for the typed string objects (strings/hi.ts). Every string read like `hi.weather.title`
 * returns the text of the current language (react-i18next resources, i18n/i18n.ts), and the Hindi text when a
 * translation is missing. So screens keep their typed, autocompleted access and Hindi stays the source.
 */
let currentBundle: () => unknown = () => undefined;

/** Called once by i18n/i18n.ts: where the current language's translations come from. */
export function setTranslationSource(source: () => unknown): void {
  currentBundle = source;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lookup(bundle: unknown, path: readonly string[]): unknown {
  let node = bundle;
  for (const key of path) {
    if (!isPlainObject(node)) return undefined;
    node = node[key];
  }
  return node;
}

/** A view of `base` (Hindi) that answers in the current language. `path` is its place in the bundle. */
export function live<T extends object>(base: T, path: readonly string[]): T {
  const children = new Map<string, unknown>();
  return new Proxy(base, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof key !== 'string') return value;
      if (isPlainObject(value)) {
        let child = children.get(key);
        if (!child) {
          child = live(value, [...path, key]);
          children.set(key, child);
        }
        return child;
      }
      const translated = lookup(currentBundle(), [...path, key]);
      if (typeof value === 'string') return typeof translated === 'string' && translated.length > 0 ? translated : value;
      // Lists (chat suggestions, consent items) are replaced as a whole, only with a list of the same length.
      if (Array.isArray(value)) return Array.isArray(translated) && translated.length === value.length ? translated : value;
      return value;
    },
  });
}

/** Same shape as the Hindi strings, every part optional (missing text falls back to Hindi). */
export type PartialText<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly PartialText<Item>[]
    : T extends number
      ? T
      : { readonly [K in keyof T]?: PartialText<T[K]> };
