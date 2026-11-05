import { useState } from 'react';
import { LuCamera, LuCircleCheckBig } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { uploadServicePhoto } from '../../api/services';
import { hiF } from '../../strings/hiFeatures';
import { compressImage } from '../../utils/compressImage';
import { PhotoActions } from '../PhotoActions';
import { notifyError, notifySuccess } from '../ui/notify';

/** Snap & List style: camera or gallery, shrunk on the phone (no GPS data), uploaded at once. */
export function PhotoUpload({ photoIds, max, onChange }: { photoIds: string[]; max: number; onChange: (ids: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File) => {
    setBusy(true);
    try {
      const id = await uploadServicePhoto(await compressImage(file));
      onChange([...photoIds, id]);
      notifySuccess(hiF.services.photoAdded);
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'PHOTO_READ_FAILED');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-lg font-bold">
        <LuCamera aria-hidden="true" className="size-6 text-primary-700" />
        {hiF.services.photo} ({photoIds.length}/{max})
        {photoIds.length > 0 && <LuCircleCheckBig aria-hidden="true" className="size-6 text-success-700" />}
      </p>
      {photoIds.length < max && <div className={busy ? 'pointer-events-none flex gap-3 opacity-60' : 'flex gap-3'}>{<PhotoActions onPick={(file) => void pick(file)} />}</div>}
    </div>
  );
}
