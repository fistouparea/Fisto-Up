import { useState } from 'react';
import { LuDatabase, LuDownload, LuFileText, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { deleteMyData, fetchMyData } from '../api/privacy';
import { Button } from '../components/ui/Button';
import { Callout } from '../components/ui/Callout';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { notifySuccess } from '../components/ui/notify';
import { routes } from '../hooks/useHashRoute';
import { useSubmit } from '../hooks/useSubmit';
import { errorMessages, hi } from '../strings/hi';
import { clearAppStorage } from '../utils/consentState';
import { saveBlob } from '../utils/download';

/** "मेरा डेटा": download everything we keep, or delete it for good (asked twice). */
export function MyDataPage() {
  const download = useSubmit();
  const removal = useSubmit();
  const [confirming, setConfirming] = useState(false);

  const onDownload = async () => {
    const blob = await download.run(fetchMyData);
    if (!blob) return;
    saveBlob(blob, 'agriai-mera-data.json');
    notifySuccess(hi.myData.downloaded);
  };

  const onDelete = async () => {
    const done = await removal.run(async () => {
      await deleteMyData();
      return true;
    });
    if (!done) return;
    notifySuccess(hi.myData.deleted);
    // Start completely fresh: new anonymous id, consent asked again, no cached screens.
    clearAppStorage();
    window.location.hash = routes.home;
    window.location.reload();
  };

  const failed = download.errorCode ?? removal.errorCode;

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.myData.title} icon={LuDatabase} speakText={`${hi.myData.title}. ${hi.myData.intro}`} />
      <p className="text-lg text-ink-700">{hi.myData.intro}</p>

      <Card icon={LuDownload} title={hi.myData.downloadTitle} speakText={`${hi.myData.downloadTitle}. ${hi.myData.downloadHint}`}>
        <p className="mb-3 text-base text-ink-700">{hi.myData.downloadHint}</p>
        <Button variant="secondary" icon={LuDownload} disabled={download.busy} onClick={() => void onDownload()}>
          {hi.myData.download}
        </Button>
      </Card>

      <Card
        tone="danger"
        icon={LuTrash2}
        title={hi.myData.deleteTitle}
        speakText={`${hi.myData.deleteTitle}. ${hi.myData.deleteWhat} ${hi.myData.deleteKeep} ${hi.myData.deleteActive}`}
      >
        <ul className="mb-3 flex list-disc flex-col gap-1 pl-5 text-base text-ink-700">
          <li>{hi.myData.deleteWhat}</li>
          <li>{hi.myData.deleteKeep}</li>
          <li>{hi.myData.deleteActive}</li>
        </ul>
        {confirming ? (
          <div className="flex flex-col gap-3" role="alertdialog" aria-labelledby="confirm-delete">
            <p id="confirm-delete" className="text-xl font-bold text-danger-700">
              {hi.myData.confirmTitle}
            </p>
            <p className="text-base text-ink-700">{hi.myData.confirmText}</p>
            <Button variant="danger" icon={LuTrash2} disabled={removal.busy} onClick={() => void onDelete()}>
              {hi.myData.confirm}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {hi.myData.cancel}
            </Button>
          </div>
        ) : (
          <Button variant="danger" icon={LuTrash2} onClick={() => setConfirming(true)}>
            {hi.myData.delete}
          </Button>
        )}
      </Card>

      {failed && <Callout tone="danger" icon={LuTriangleAlert} text={errorMessages[failed]} />}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" size="md" icon={LuFileText} onClick={() => (window.location.hash = routes.privacy)}>
          {hi.myData.privacyLink}
        </Button>
        <Button variant="ghost" size="md" icon={LuFileText} onClick={() => (window.location.hash = routes.terms)}>
          {hi.myData.termsLink}
        </Button>
      </div>
    </section>
  );
}

