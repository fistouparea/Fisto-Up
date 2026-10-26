import { useEffect, useState, type FormEvent } from 'react';
import { LuRefreshCw, LuSearch, LuSearchX, LuShoppingBasket, LuSlidersHorizontal, LuWifiOff } from 'react-icons/lu';
import { PRODUCT_IDS, type Category, type SearchFilters } from '../../api/marketTypes';
import { ListingCard } from '../../components/market/ListingCard';
import { FilterPanel } from '../../components/market/FilterPanel';
import { activeFilterCount } from '../../utils/marketFilters';
import { LangToggle } from '../../components/market/LangToggle';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { PRODUCT_CATALOG } from '../../data/marketCatalog';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useLang } from '../../hooks/useLang';
import { useMarketSearch } from '../../hooks/useMarketSearch';
import { productLabels } from '../../strings/hi';

const FILTERS_KEY = 'agriai.marketFilters';

/** Filters survive opening a listing and coming back. */
function loadFilters(): SearchFilters {
  try {
    const saved = sessionStorage.getItem(FILTERS_KEY);
    if (saved) return JSON.parse(saved) as SearchFilters;
  } catch {
    // Start fresh.
  }
  return { sort: 'newest' };
}

export function MarketPage() {
  const { lang, t } = useLang();
  const { offline } = useConnectivity();
  const [filters, setFilters] = useState<SearchFilters>(loadFilters);
  const [query, setQuery] = useState(filters.q ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const { items, loading, hasMore, errorCode, loadMore, retry } = useMarketSearch(filters);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    } catch {
      // Not remembered; fine.
    }
  }, [filters]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: query.trim() || undefined }));
  };
  const chooseCategory = (category: Category | undefined) => setFilters((current) => ({ ...current, category, product: undefined }));
  const products = PRODUCT_IDS.filter((id) => !filters.category || PRODUCT_CATALOG[id].category === filters.category);
  const filterCount = activeFilterCount(filters);

  return (
    <section className="flex flex-col gap-4" lang={lang}>
      <div className="flex items-start gap-3">
        <LuShoppingBasket aria-hidden="true" className="mt-1 size-8 shrink-0 text-primary-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-tight">{t.title}</h2>
          <p className="text-base text-ink-500">{t.subtitle}</p>
        </div>
        <LangToggle />
      </div>

      {offline && <Callout tone="warning" icon={LuWifiOff} text={t.offline} />}

      <form role="search" onSubmit={search} className="flex gap-2">
        <label htmlFor="market-search" className="sr-only">
          {t.search}
        </label>
        <input
          id="market-search"
          type="search"
          value={query}
          maxLength={50}
          placeholder={t.searchPlaceholder}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-lg focus:border-primary-700 focus:outline-none"
        />
        <button type="submit" aria-label={t.search} className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-700 text-white">
          <LuSearch aria-hidden="true" className="size-6" />
        </button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t.filters}>
        <Button
          variant={filterCount > 0 ? 'primary' : 'secondary'}
          size="md"
          fullWidth={false}
          icon={LuSlidersHorizontal}
          aria-expanded={showFilters}
          onClick={() => setShowFilters((open) => !open)}
          className="shrink-0 whitespace-nowrap rounded-full px-4"
        >
          {filterCount > 0 ? `${t.filters} (${filterCount})` : t.filters}
        </Button>
        <Chip label={t.all} selected={!filters.category} onClick={() => chooseCategory(undefined)} />
        <Chip label={t.crops} selected={filters.category === 'crop'} onClick={() => chooseCategory('crop')} />
        <Chip label={t.shg} selected={filters.category === 'shg'} onClick={() => chooseCategory('shg')} />
        <Chip label={t.inputs} selected={filters.category === 'input'} onClick={() => chooseCategory('input')} />
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {products.map((product) => (
          <Chip
            key={product}
            label={productLabels[product][lang]}
            selected={filters.product === product}
            onClick={() => setFilters((current) => ({ ...current, product: current.product === product ? undefined : product }))}
          />
        ))}
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onClose={() => setShowFilters(false)}
          onApply={(next) => {
            setFilters(next);
            setShowFilters(false);
          }}
        />
      )}

      {items.length === 0 && loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label={t.loading}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-72" />
          ))}
        </div>
      )}
      {items.length === 0 && !loading && errorCode && (
        <EmptyState icon={LuWifiOff} tone="warning" message={t.loadFailed}>
          <Button variant="accent" icon={LuRefreshCw} onClick={retry}>
            {t.retry}
          </Button>
        </EmptyState>
      )}
      {items.length === 0 && !loading && !errorCode && <EmptyState icon={LuSearchX} message={t.empty} />}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
      {items.length > 0 && (hasMore || errorCode) && (
        <Button variant="secondary" icon={LuRefreshCw} disabled={loading} onClick={loadMore}>
          {loading ? t.loading : t.loadMore}
        </Button>
      )}
    </section>
  );
}
