import { LuClock, LuFilePen, LuOctagonAlert } from 'react-icons/lu';
import type { SellerProfile } from '../../api/marketTypes';
import { hi } from '../../strings/hi';
import { Callout } from '../ui/Callout';

/** Tells the seller what is missing or what happens next (nothing when verified and complete). */
export function SellerStatusCallout({ seller }: { seller: SellerProfile }) {
  if (!seller.profileComplete) return <Callout tone="cream" icon={LuFilePen} text={hi.account.fillSellerProfile} />;
  if (seller.status === 'pending') return <Callout tone="warning" icon={LuClock} text={hi.account.pendingHint} />;
  if (seller.status === 'rejected') {
    return <Callout tone="danger" icon={LuOctagonAlert} text={`${hi.account.rejectedHint} ${seller.rejectReason ?? ''}`} />;
  }
  return null;
}

