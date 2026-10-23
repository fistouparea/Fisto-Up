import { createListing } from '../../api/listings';
import { SnapListFlow } from '../../components/market/SnapListFlow';
import { routes } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';

/** The seller's own Snap & List. */
export function SnapListPage() {
  return <SnapListFlow submit={createListing} onFinished={() => navigateTo(routes.sell)} finishLabel={hi.sell.goToMySales} />;
}
