import { LuChevronRight } from 'react-icons/lu';
import { hi } from '../../strings/hi';

/** "पूरा देखें ›" at the bottom of a dashboard card. */
export function SeeAllLink({ href, label = hi.home.seeAll }: { href: string; label?: string }) {
  return (
    <a href={href} className="mt-1 flex min-h-12 items-center justify-end gap-1 text-lg font-bold text-primary-700 hover:underline">
      {label}
      <LuChevronRight aria-hidden="true" className="size-6" />
    </a>
  );
}
