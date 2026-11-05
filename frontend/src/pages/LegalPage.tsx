import { LuFileText, LuTriangleAlert } from 'react-icons/lu';
import { LangToggle } from '../components/market/LangToggle';
import { Callout } from '../components/ui/Callout';
import { PageHeader } from '../components/ui/PageHeader';
import { useLang } from '../hooks/useLang';
import { legalEn } from '../strings/en';
import { hi } from '../strings/hi';
import { legalHi } from '../strings/legalHi';

/** Privacy policy or terms, in Hindi or English (toggle). Clearly marked as a draft until a lawyer reviewed it. */
export function LegalPage({ doc }: { doc: 'privacy' | 'terms' }) {
  const { lang } = useLang();
  const texts = lang === 'en' ? legalEn : legalHi;
  const page = texts[doc];

  return (
    <article className="flex flex-col gap-4" lang={lang}>
      <PageHeader title={page.title} icon={LuFileText} onBack={() => window.history.back()} backLabel={hi.back} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-base text-ink-500">{page.updated}</p>
        <LangToggle />
      </div>
      <Callout tone="warning" icon={LuTriangleAlert} text={texts.draftNotice} />
      {page.sections.map((section) => (
        <section key={section.heading} className="rounded-3xl border-2 border-line bg-surface p-4">
          <h3 className="mb-1 text-xl font-bold text-ink-900">{section.heading}</h3>
          <p className="text-lg leading-relaxed text-ink-700">{section.body}</p>
        </section>
      ))}
    </article>
  );
}
