import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { hiAdmin } from '../../strings/hiAdmin';
import { Button } from '../ui/Button';

export function Pager({ page, hasMore, onPage }: { page: number; hasMore: boolean; onPage: (page: number) => void }) {
  if (page === 1 && !hasMore) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="secondary" size="md" fullWidth={false} icon={LuChevronLeft} disabled={page === 1} onClick={() => onPage(page - 1)}>
        {hiAdmin.console.previous}
      </Button>
      <span className="text-base text-ink-700">{page}</span>
      <Button variant="secondary" size="md" fullWidth={false} icon={LuChevronRight} disabled={!hasMore} onClick={() => onPage(page + 1)}>
        {hiAdmin.console.next}
      </Button>
    </div>
  );
}
