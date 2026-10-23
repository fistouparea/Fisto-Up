import type { ReactNode } from 'react';
import { LuLock, LuLogIn } from 'react-icons/lu';
import type { Account, Role } from '../../api/marketTypes';
import { useAuth } from '../../hooks/useAuth';
import { errorMessages, hi } from '../../strings/hi';
import { goToLogin } from '../../utils/loginRedirect';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

interface RequireRoleProps {
  /** Omit to allow any logged-in user. */
  roles?: Role[];
  children: (user: Account) => ReactNode;
}

/** Shows the screen only to logged-in users with one of `roles`. The server checks again on every request. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth();
  if (user === undefined) return <Skeleton className="h-64" />;
  if (user === null) {
    return (
      <EmptyState icon={LuLogIn} message={errorMessages.UNAUTHORIZED}>
        <Button variant="accent" icon={LuLogIn} onClick={() => goToLogin()}>
          {hi.auth.login}
        </Button>
      </EmptyState>
    );
  }
  if (roles && !roles.includes(user.role)) {
    return <EmptyState icon={LuLock} tone="warning" message={errorMessages.FORBIDDEN} />;
  }
  return <>{children(user)}</>;
}
