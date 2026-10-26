import { createListing } from '../../api/listings';
import type { Account } from '../../api/marketTypes';
import { SnapListFlow } from '../../components/market/SnapListFlow';
import { routes } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';

/** The seller's own Snap & List (input dealers list without the AI). */
export function SnapListPage({ user }: { user: Account }) {
  return (
    <SnapListFlow
      submit={createListing}
      dealer={user.seller?.kind === 'input_dealer'}
      onFinished={() => navigateTo(routes.sell)}
      finishLabel={hi.sell.goToMySales}
    />
  );
}
