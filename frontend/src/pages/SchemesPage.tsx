import { LuExternalLink, LuLandmark, LuLightbulb, LuPhone, LuRefreshCw, LuShieldQuestion } from 'react-icons/lu';
import { fetchSchemesForMe, type SchemeForMe } from '../api/schemes';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Callout } from '../components/ui/Callout';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { useFlags } from '../hooks/useFlags';
import { useLoad } from '../hooks/useLoad';
import { hi } from '../strings/hi';

const dayFormat = new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatDay = (isoDate: string) => dayFormat.format(new Date(`${isoDate}T00:00:00Z`));

/** "मेरे लिए योजनाएँ": central + Rajasthan farmer schemes, simple hints from the farm, always "check officially". */
export function SchemesPage() {
  const { schemes } = useFlags();
  const { data, errorCode, reload } = useLoad(() => (schemes ? fetchSchemesForMe() : Promise.resolve([])), [schemes]);

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.schemes.title} icon={LuLandmark} speakText={`${hi.schemes.title}. ${hi.schemes.intro}`} />
      {!schemes ? (
        <EmptyState icon={LuLandmark} message={hi.schemes.off} />
      ) : (
        <>
          <p className="text-lg text-ink-700" data-read-aloud>
            {hi.schemes.intro}
          </p>
          <Callout tone="cream" icon={LuShieldQuestion} text={hi.schemes.checkOfficial} />
          {data === undefined && !errorCode && <Skeleton className="h-64" />}
          {errorCode && data === undefined && (
            <EmptyState icon={LuRefreshCw} tone="warning" message={hi.schemes.loadFailed}>
              <Button variant="accent" icon={LuRefreshCw} onClick={reload}>
                {hi.tryAgain}
              </Button>
            </EmptyState>
          )}
          {data?.map((scheme) => <SchemeCard key={scheme.id} scheme={scheme} />)}
        </>
      )}
    </section>
  );
}

function SchemeCard({ scheme }: { scheme: SchemeForMe }) {
  const speak = [
    scheme.name,
    scheme.summary,
    ...scheme.hints,
    scheme.whoCanApply.length > 0 ? `${hi.schemes.whoCanApply}: ${scheme.whoCanApply.join(', ')}` : '',
    scheme.documents.length > 0 ? `${hi.schemes.documents}: ${scheme.documents.join(', ')}` : '',
    scheme.checkLine,
  ]
    .filter(Boolean)
    .join('। ');

  return (
    <Card icon={LuLandmark} title={scheme.name} speakText={speak}>
      <div className="mb-2 flex flex-wrap gap-2">
        <Badge tone="neutral" label={scheme.level === 'central' ? hi.schemes.central : hi.schemes.rajasthan} />
        {scheme.status === 'verify' && <Badge tone="warning" label={hi.schemes.verifyBadge} />}
      </div>
      <p>{scheme.summary}</p>
      {scheme.hints.map((hint) => (
        <p key={hint} className="mt-3 flex gap-2 rounded-2xl bg-success-50 p-3 text-base font-bold text-success-800">
          <LuLightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {hint}
        </p>
      ))}
      {scheme.whoCanApply.length > 0 && <Lines title={hi.schemes.whoCanApply} lines={scheme.whoCanApply} />}
      {scheme.documents.length > 0 && <Lines title={hi.schemes.documents} lines={scheme.documents} />}
      {scheme.status === 'verify' && <p className="mt-3 text-base text-ink-500">{hi.schemes.verifyNote}</p>}
      <p className="mt-3 text-base font-bold text-ink-900">{scheme.checkLine}</p>
      <div className="mt-3 flex flex-col gap-2">
        <a
          href={scheme.officialLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary-700 px-4 text-lg font-bold text-primary-700"
        >
          <LuExternalLink aria-hidden="true" className="size-6" />
          {hi.schemes.officialSite}
        </a>
        {scheme.helpline && (
          <a href={`tel:${scheme.helpline.replace(/\D/g, '')}`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary-700 px-4 text-lg font-bold text-white">
            <LuPhone aria-hidden="true" className="size-6" />
            {hi.schemes.helpline}: {scheme.helpline}
          </a>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-500">
        {scheme.last_verified ? `${hi.schemes.lastVerified}: ${formatDay(scheme.last_verified)}` : hi.schemes.neverVerified}
      </p>
    </Card>
  );
}

function Lines({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="mt-3">
      <h4 className="font-bold">{title}</h4>
      <ul className="list-disc pl-6">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
