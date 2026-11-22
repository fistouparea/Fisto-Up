import { useState, type FormEvent } from 'react';
import { LuLockOpen, LuLogOut, LuPhone, LuSearch, LuUsers } from 'react-icons/lu';
import { endUserSessions, fetchUsers, unlockUser, type AdminUser } from '../../api/adminConsole';
import type { Role } from '../../api/marketTypes';
import { ConfirmAction } from '../../components/admin/ConfirmAction';
import { LoadState } from '../../components/admin/LoadState';
import { Pager } from '../../components/admin/Pager';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLoad } from '../../hooks/useLoad';
import { roleLabels, sellerStatusLabels } from '../../strings/hi';
import { hiAdmin } from '../../strings/hiAdmin';
import { formatDate } from '../../utils/formatDate';
import { runAdminAction } from './adminAction';

type Filter = 'all' | 'locked' | Role;
const FILTERS: Filter[] = ['all', 'seller', 'buyer', 'coordinator', 'locked'];

/** Every account: find a person, unlock a login, log a lost phone out. Both actions are audited. */
export function AdminUsers() {
  const [filter, setFilter] = useState<Filter>('all');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const text = hiAdmin.users;
  const users = useLoad(
    () => fetchUsers({ q, page, locked: filter === 'locked', role: filter === 'all' || filter === 'locked' ? undefined : filter }),
    [q, page, filter],
  );

  const search = (event: FormEvent) => {
    event.preventDefault();
    setQ(input);
    setPage(1);
  };
  const labelOf = (item: Filter) => (item === 'all' ? hiAdmin.all : item === 'locked' ? text.locked : roleLabels[item]);

  return (
    <div className="flex flex-col gap-4">
      <form role="search" onSubmit={search} className="flex gap-2">
        <input
          aria-label={hiAdmin.search}
          placeholder={hiAdmin.search}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-lg focus:border-primary-700 focus:outline-none"
        />
        <button type="submit" aria-label={hiAdmin.search} className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-700 text-white">
          <LuSearch aria-hidden="true" className="size-6" />
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Chip
            key={item}
            label={labelOf(item)}
            selected={filter === item}
            onClick={() => {
              setFilter(item);
              setPage(1);
            }}
          />
        ))}
      </div>
      <LoadState data={users.data} errorCode={users.errorCode} reload={users.reload}>
        {({ items, total, hasMore }) =>
          items.length === 0 ? (
            <EmptyState icon={LuUsers} message={text.none} />
          ) : (
            <>
              <p className="text-base text-ink-700">
                {total} {text.count}
              </p>
              <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                {items.map((user) => (
                  <UserRow key={user.id} user={user} onChanged={users.reload} />
                ))}
              </ul>
              <Pager page={page} hasMore={hasMore} onPage={setPage} />
            </>
          )
        }
      </LoadState>
    </div>
  );
}

function UserRow({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const text = hiAdmin.users;
  const facts = [roleLabels[user.role], user.village, user.sellerStatus && sellerStatusLabels[user.sellerStatus], `${hiAdmin.joined}: ${formatDate(user.createdAt)}`];

  return (
    <li className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">{user.name}</h2>
          {user.locked && <Badge tone="danger" label={text.locked} />}
          {user.pilot && <Badge tone="neutral" label={text.pilot} />}
          {user.demo && <Badge tone="warning" label={text.demo} />}
        </div>
        <p className="text-sm text-ink-700">{facts.filter(Boolean).join(' · ')}</p>
        <a href={`tel:+91${user.phone}`} className="inline-flex min-h-10 items-center gap-1 text-base font-bold text-primary-700">
          <LuPhone aria-hidden="true" className="size-4" />
          {user.phone}
        </a>
      </div>
      {user.role !== 'coordinator' && (
        <div className="flex flex-col gap-2 md:w-72">
          {user.locked && (
            <Button size="md" icon={LuLockOpen} onClick={() => void runAdminAction(() => unlockUser(user.id), text.unlocked, onChanged)}>
              {text.unlock}
            </Button>
          )}
          <ConfirmAction question={`${user.name}: ${text.endSessionsAsk}`} onConfirm={() => runAdminAction(() => endUserSessions(user.id), text.sessionsEnded, onChanged)}>
            {(ask) => (
              <Button variant="ghost" size="md" icon={LuLogOut} onClick={ask}>
                {text.endSessions}
              </Button>
            )}
          </ConfirmAction>
        </div>
      )}
    </li>
  );
}
