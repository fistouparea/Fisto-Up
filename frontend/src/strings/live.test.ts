import { afterEach, describe, expect, it } from 'vitest';
import { live, setTranslationSource } from './live';

const base = { title: 'मौसम', nested: { ok: 'ठीक', list: ['एक', 'दो'] } };

describe('live strings', () => {
  afterEach(() => setTranslationSource(() => undefined));

  it('answers in the current language and falls back to Hindi', () => {
    let bundle: unknown = { app: { title: 'Weather', nested: { list: ['one', 'two'] } } };
    setTranslationSource(() => bundle);
    const strings = live(base, ['app']);
    expect(strings.title).toBe('Weather');
    expect(strings.nested.ok).toBe('ठीक');
    expect(strings.nested.list).toEqual(['one', 'two']);
    bundle = undefined;
    expect(strings.title).toBe('मौसम');
  });

  it('ignores empty texts and lists of another length', () => {
    setTranslationSource(() => ({ app: { title: '', nested: { list: ['only one'] } } }));
    const strings = live(base, ['app']);
    expect(strings.title).toBe('मौसम');
    expect(strings.nested.list).toEqual(['एक', 'दो']);
  });
});
