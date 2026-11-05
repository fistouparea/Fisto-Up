import { useState, type FormEvent } from 'react';
import { LuCircleCheckBig } from 'react-icons/lu';
import { createService } from '../../api/services';
import type { Account, Place } from '../../api/marketTypes';
import { VoiceTextBox } from '../../components/VoiceTextBox';
import { TehsilPicker } from '../../components/market/TehsilPicker';
import { DayPicker } from '../../components/services/DayPicker';
import { PhotoUpload } from '../../components/services/PhotoUpload';
import { KIND_FIELDS } from '../../components/services/kinds';
import type { KindFieldsValue } from '../../components/services/kinds/kindFields';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { Chip } from '../../components/ui/Chip';
import { PageHeader } from '../../components/ui/PageHeader';
import { StickyActions } from '../../components/ui/StickyActions';
import { TextField } from '../../components/ui/TextField';
import { notifySuccess } from '../../components/ui/notify';
import { PRICE_UNIT_LABELS, SERVICE_KIND_INFO, type PriceUnit, type ServiceKind, type ServiceSide } from '../../data/serviceKinds';
import { routes } from '../../hooks/useHashRoute';
import { useSubmit } from '../../hooks/useSubmit';
import { hi, marketErrorMessage } from '../../strings/hi';
import { hiF } from '../../strings/hiFeatures';
import { addDays, todayInIndia } from '../../utils/indiaDate';
import { rupeesToPaise } from '../../utils/money';
import { navigateTo } from '../../utils/navigate';

/** Calendar shows the next 30 days (the server allows up to 90). */
const CALENDAR_DAYS = 30;

/** One form for every kind: photo, kind's own fields, price, village/tehsil, free days, spoken description. */
export function NewServicePage({ kind, side, user }: { kind: ServiceKind; side: ServiceSide; user: Account }) {
  const info = SERVICE_KIND_INFO[kind];
  const { Fields, check } = KIND_FIELDS[kind];
  const [fields, setFields] = useState<KindFieldsValue>({ typeId: null, skills: [], details: kind === 'equipment' ? { withOperator: true } : {} });
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [village, setVillage] = useState(user.seller?.village ?? user.buyer?.village ?? '');
  const [place, setPlace] = useState<Place | undefined>(user.seller?.pickup);
  const [priceInput, setPriceInput] = useState('');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>(info.priceUnits[0] ?? 'day');
  const [dates, setDates] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const { busy, errorCode, run } = useSubmit();
  const today = todayInIndia();
  const days = Array.from({ length: CALENDAR_DAYS }, (_, index) => addDays(today, index));

  const price = rupeesToPaise(priceInput);
  const kindError = check(side, fields);
  const errors = {
    title: title.trim().length < 2 ? hi.sellerProfile.required : undefined,
    village: village.trim() ? undefined : hi.sellerProfile.required,
    price: price === null ? hi.sell.missing.price : undefined,
    place: place ? undefined : hi.sellerProfile.chooseTehsil,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (kindError || !place || price === null || Object.values(errors).some(Boolean)) return;
    const created = await run(() =>
      createService({
        kind,
        side,
        ...(kind === 'labour' ? { skills: fields.skills } : { typeId: fields.typeId ?? undefined }),
        title: title.trim(),
        description: description.trim(),
        photoIds,
        village: village.trim(),
        place: { district: place.district, tehsil: place.tehsil, lat: place.lat, lon: place.lon },
        pricePaise: price,
        priceUnit,
        availableDates: info.bookedByDate ? dates : [],
        details: fields.details,
      }),
    );
    if (!created) return;
    notifySuccess(hiF.services.published);
    navigateTo(routes.serviceItem(created.id));
  };

  const heading = kind === 'labour' ? (side === 'need' ? hiF.services.labourAddNeed : hiF.services.kinds.labour.add) : hiF.services.kinds[kind].add;
  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <PageHeader title={heading} icon={info.icon} />
      {info.needsApproval && <Callout tone="cream" icon={info.icon} text={hiF.services.pendingApproval} />}
      {kind === 'livestock' && <Callout tone="warning" icon={info.icon} text={hiF.services.livestock.legal} />}
      <PhotoUpload photoIds={photoIds} max={info.maxPhotos} onChange={setPhotoIds} />
      <Fields side={side} value={fields} onChange={setFields} showErrors={showErrors} />
      <TextField label={hiF.services.title} hint={hiF.services.titleHint} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} error={showErrors ? errors.title : undefined} />
      <VoiceTextBox id="service-description" label={hiF.services.describe} value={description} onChange={setDescription} maxLength={500} />
      <div className="flex flex-col gap-2">
        <TextField
          label={kind === 'labour' ? hiF.services.labour.wage : hiF.services.price}
          inputMode="decimal"
          prefix="₹"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value.replace(/[^\d.]/g, ''))}
          error={showErrors ? errors.price : undefined}
          inputClassName="text-2xl font-bold"
        />
        <div className="flex flex-wrap gap-2">
          {info.priceUnits.map((unit) => (
            <Chip key={unit} label={`${hiF.services.per} ${PRICE_UNIT_LABELS[unit]}`} selected={priceUnit === unit} onClick={() => setPriceUnit(unit)} />
          ))}
        </div>
      </div>
      {info.bookedByDate && (
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">{hiF.services.calendar}</h3>
          <p className="text-base text-ink-500">{hiF.services.calendarHint}</p>
          <DayPicker days={days} selected={dates} onChange={setDates} label={hiF.services.calendar} />
        </div>
      )}
      <TextField label={hiF.services.village} value={village} maxLength={60} onChange={(e) => setVillage(e.target.value)} error={showErrors ? errors.village : undefined} />
      <h3 className="text-lg font-bold">{hiF.services.place}</h3>
      <TehsilPicker value={place} onChange={setPlace} />
      {showErrors && (errors.place || kindError) && <p className="font-bold text-danger-700">{errors.place ?? kindError}</p>}
      {errorCode && <Callout tone="danger" icon={info.icon} text={marketErrorMessage(errorCode)} />}
      <StickyActions>
        <Button type="submit" variant="accent" size="hero" icon={LuCircleCheckBig} disabled={busy}>
          {hiF.services.publish}
        </Button>
      </StickyActions>
    </form>
  );
}
