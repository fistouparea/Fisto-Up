import { LuArrowRight, LuUserRound } from 'react-icons/lu';
import type { Account } from '../../api/marketTypes';
import { hi, roleLabels } from '../../strings/hi';
import { roleHome } from '../../utils/loginRedirect';
import { navigateTo } from '../../utils/navigate';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/** Shown on the login / sign-up screens when someone is already logged in. */
export function AlreadyLoggedIn({ user }: { user: Account }) {
  return (
    <EmptyState icon={LuUserRound} tone="success" message={`${hi.auth.loggedInAs} ${user.name} (${roleLabels[user.role]})`}>
      <Button variant="accent" icon={LuArrowRight} onClick={() => navigateTo(roleHome(user.role))}>
        {hi.auth.continue}
      </Button>
    </EmptyState>
  );
}
