import { LuClock, LuFilePen, LuOctagonAlert, LuQrCode } from 'react-icons/lu';
import type { SellerProfile } from '../../api/marketTypes';
import { hi } from '../../strings/hi';
import { Callout } from '../ui/Callout';

/** Tells the seller what is missing or what happens next (nothing when verified and complete). */
export function SellerStatusCallout({ seller }: { seller: SellerProfile }) {
  // Cash payment switched off and no UPI ID: the seller's listings are hidden until one is added.
  if (seller.upiNeeded) return <Callout tone="danger" icon={LuQrCode} text={hi.account.upiNeeded} />;
  if (!seller.profileComplete) return <Callout tone="cream" icon={LuFilePen} text={hi.account.fillSellerProfile} />;
  if (seller.status === 'pending') return <Callout tone="warning" icon={LuClock} text={hi.account.pendingHint} />;
  if (seller.status === 'rejected') {
    return <Callout tone="danger" icon={LuOctagonAlert} text={`${hi.account.rejectedHint} ${seller.rejectReason ?? ''}`} />;
  }
  return null;
}

