import type { ReactNode } from 'react';
import type { Diagnosis } from '../api/types';
import { hi } from '../strings/hi';

interface ResultViewProps {
  diagnosis: Diagnosis;
}

export function ResultView({ diagnosis }: ResultViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Section icon="🔍" title={hi.sections.problem} highlight>
        <p className="text-2xl font-bold">{diagnosis.problem_name}</p>
      </Section>

      <Section icon="❓" title={hi.sections.cause}>
        <p>{diagnosis.explanation}</p>
      </Section>

      {diagnosis.desi_upay.length > 0 && (
        <Section icon="🌿" title={hi.sections.desiUpay}>
          <BulletList items={diagnosis.desi_upay} />
        </Section>
      )}

      {diagnosis.dawai.length > 0 && (
        <p role="note" className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-lg font-bold text-amber-900">
          <span aria-hidden="true">🧤 </span>
          {hi.dawaiWarning}
        </p>
      )}

      <Section icon="💊" title={hi.sections.dawai}>
        {diagnosis.dawai.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {diagnosis.dawai.map((dawai, index) => (
              <li key={index} className="rounded-xl bg-white p-3">
                <p className="font-bold">{dawai.name}</p>
                <p className="mt-1">{dawai.kaise_use_karein}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>{hi.noDawaiNeeded}</p>
        )}
      </Section>

      {diagnosis.savdhani.length > 0 && (
        <Section icon="⚠️" title={hi.sections.savdhani}>
          <BulletList items={diagnosis.savdhani} />
        </Section>
      )}

      <p className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 text-xl font-bold leading-relaxed text-blue-900">
        <span aria-hidden="true">🏫 </span>
        {hi.kvkAdvice}
      </p>
    </div>
  );
}

interface SectionProps {
  icon: string;
  title: string;
  highlight?: boolean;
  children: ReactNode;
}

function Section({ icon, title, highlight = false, children }: SectionProps) {
  return (
    <section className={`rounded-2xl p-4 ${highlight ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50'}`}>
      <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-gray-700">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      <div className="text-xl leading-relaxed text-gray-900">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-6">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
