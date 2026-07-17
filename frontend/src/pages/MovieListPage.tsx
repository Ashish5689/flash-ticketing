import { useDeferredValue, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { EventCard, MovieCard } from '../components/catalog/MovieCard';
import { CatalogShell } from '../components/layout/CatalogShell';
import { Button, Input, Modal, Select, Skeleton } from '../components/ui';
import { getMovieFacets, getMovies } from '../lib/catalog-api';
import { useCatalogStore } from '../stores/catalogStore';

const filterLabels: Record<string, string> = {
  contentType: 'Type',
  language: 'Language',
  genre: 'Genre',
  city: 'City',
  dateFrom: 'From',
  dateTo: 'To',
};

export default function MovieListPage() {
  const [params, setParams] = useSearchParams();
  const preferredCity = useCatalogStore((state) => state.city);
  const setPreferredCity = useCatalogStore((state) => state.setCity);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const language = params.get('language') ?? '';
  const genre = params.get('genre') ?? '';
  const city = params.get('city') ?? preferredCity;
  const contentType = params.get('contentType') ?? '';
  const dateFrom = params.get('dateFrom') ?? '';
  const dateTo = params.get('dateTo') ?? '';
  const facetsQuery = useQuery({ queryKey: ['movie-facets'], queryFn: getMovieFacets });
  const moviesQuery = useQuery({
    queryKey: ['movies', deferredSearch, language, genre, city, contentType, dateFrom, dateTo],
    queryFn: () =>
      getMovies({
        q: deferredSearch || undefined,
        language: language || undefined,
        genre: genre || undefined,
        city: city || undefined,
        contentType: (contentType || undefined) as 'movie' | 'event' | undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  useEffect(() => {
    if (!params.get('city')) {
      const next = new URLSearchParams(params);
      next.set('city', preferredCity);
      setParams(next, { replace: true });
    }
  }, [params, preferredCity, setParams]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'city' && value) setPreferredCity(value);
    if (key === 'dateFrom' && value && !next.get('dateTo')) next.set('dateTo', value);
    if (key === 'dateTo' && value && !next.get('dateFrom')) next.set('dateFrom', value);
    if (key === 'dateFrom' && !value) next.delete('dateTo');
    if (key === 'dateTo' && !value) next.delete('dateFrom');
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch('');
    setParams(new URLSearchParams({ city: preferredCity }), { replace: true });
  };

  const activeFilters = [...params.entries()].filter(([key, value]) => key !== 'q' && value);
  const heading =
    contentType === 'event'
      ? 'Live events'
      : contentType === 'movie'
        ? 'Movies'
        : 'Movies & events';

  return (
    <CatalogShell>
      <main className="w-full flex-1 bg-surface">
        <section className="border-b border-border bg-surface-subtle px-5 py-10 sm:px-8">
          <div className="mx-auto max-w-content">
            <h1 className="text-4xl font-extrabold tracking-tight">{heading}</h1>
            <p className="mt-3 text-muted">
              Discover what is playing in {city}, then book your preferred show.
            </p>
            <div className="mt-7 flex gap-3">
              <div className="max-w-xl flex-1">
                <Input
                  aria-label="Search catalog"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setFilter('q', event.target.value);
                  }}
                  placeholder="Search by title"
                  value={search}
                />
              </div>
              <Button className="lg:hidden" onClick={() => setFiltersOpen(true)} variant="outline">
                Filters
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-content px-5 py-8 sm:px-8">
          <div className="hidden grid-cols-5 gap-3 rounded-xl border border-border bg-surface p-4 lg:grid">
            <Filters
              city={city}
              cities={facetsQuery.data?.cities ?? []}
              contentType={contentType}
              dateFrom={dateFrom}
              dateTo={dateTo}
              genre={genre}
              genres={facetsQuery.data?.genres ?? []}
              language={language}
              languages={facetsQuery.data?.languages ?? []}
              setFilter={setFilter}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold text-muted" aria-live="polite">
              {moviesQuery.isLoading
                ? 'Finding listings…'
                : `${moviesQuery.data?.length ?? 0} results`}
            </p>
            {activeFilters.length ? (
              <button
                className="text-sm font-bold text-brand hover:text-brand-hover"
                onClick={clearFilters}
                type="button"
              >
                Clear all
              </button>
            ) : null}
          </div>
          {activeFilters.length ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
              {activeFilters.map(([key, value]) => (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-semibold hover:border-brand"
                  key={key}
                  onClick={() => setFilter(key, '')}
                  type="button"
                >
                  {filterLabels[key] ?? key}: {value} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}

          {moviesQuery.isLoading ? <CatalogSkeleton landscape={contentType === 'event'} /> : null}
          {moviesQuery.isError ? (
            <div className="mt-8 rounded-xl border border-brand/25 bg-brand-soft p-6 text-center">
              <p className="font-bold">The catalog could not be loaded.</p>
              <button
                className="mt-3 text-sm font-bold text-brand underline"
                onClick={() => void moviesQuery.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : null}
          {moviesQuery.data?.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border bg-surface-subtle px-6 py-16 text-center">
              <h2 className="text-xl font-bold">No listings found</h2>
              <p className="mt-2 text-sm text-muted">
                Try another title, city, date, language, or genre.
              </p>
              <Button className="mt-6" onClick={clearFilters} variant="outline">
                Reset filters
              </Button>
            </div>
          ) : null}
          {moviesQuery.data && moviesQuery.data.length > 0 ? (
            contentType === 'event' ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {moviesQuery.data.map((event) => (
                  <EventCard event={event} key={event.id} />
                ))}
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {moviesQuery.data.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            )
          ) : null}
        </div>
      </main>

      <Modal
        description="Narrow listings without losing your current search."
        footer={
          <Button fullWidth onClick={() => setFiltersOpen(false)}>
            Show {moviesQuery.data?.length ?? 0} results
          </Button>
        }
        onClose={() => setFiltersOpen(false)}
        open={filtersOpen}
        title="Filter listings"
      >
        <div className="grid gap-4">
          <Filters
            city={city}
            cities={facetsQuery.data?.cities ?? []}
            contentType={contentType}
            dateFrom={dateFrom}
            dateTo={dateTo}
            genre={genre}
            genres={facetsQuery.data?.genres ?? []}
            language={language}
            languages={facetsQuery.data?.languages ?? []}
            setFilter={setFilter}
          />
        </div>
      </Modal>
    </CatalogShell>
  );
}

type FilterProps = {
  contentType: string;
  language: string;
  genre: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  languages: string[];
  genres: string[];
  cities: string[];
  setFilter: (key: string, value: string) => void;
};

function Filters(props: FilterProps) {
  return (
    <>
      <Select
        aria-label="Filter by content type"
        onChange={(event) => props.setFilter('contentType', event.target.value)}
        value={props.contentType}
      >
        <option value="">All types</option>
        <option value="movie">Movies</option>
        <option value="event">Events</option>
      </Select>
      <Select
        aria-label="Filter by language"
        onChange={(event) => props.setFilter('language', event.target.value)}
        value={props.language}
      >
        <option value="">All languages</option>
        {props.languages.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </Select>
      <Select
        aria-label="Filter by genre"
        onChange={(event) => props.setFilter('genre', event.target.value)}
        value={props.genre}
      >
        <option value="">All genres</option>
        {props.genres.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </Select>
      <Select
        aria-label="Filter by city"
        onChange={(event) => props.setFilter('city', event.target.value)}
        value={props.city}
      >
        {props.cities.length ? (
          props.cities.map((item) => <option key={item}>{item}</option>)
        ) : (
          <option>{props.city}</option>
        )}
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <input
          aria-label="Shows from date"
          className="min-h-11 min-w-0 rounded border border-border bg-surface px-2 text-xs"
          onChange={(event) => props.setFilter('dateFrom', event.target.value)}
          type="date"
          value={props.dateFrom}
        />
        <input
          aria-label="Shows to date"
          className="min-h-11 min-w-0 rounded border border-border bg-surface px-2 text-xs"
          min={props.dateFrom || undefined}
          onChange={(event) => props.setFilter('dateTo', event.target.value)}
          type="date"
          value={props.dateTo}
        />
      </div>
    </>
  );
}

function CatalogSkeleton({ landscape }: { landscape: boolean }) {
  return (
    <div
      className={
        landscape
          ? 'mt-8 grid gap-5 md:grid-cols-2'
          : 'mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'
      }
    >
      {Array.from({ length: landscape ? 4 : 10 }, (_, index) => (
        <div key={index}>
          <Skeleton
            className={landscape ? 'aspect-[16/8] rounded-xl' : 'aspect-[2/3] rounded-xl'}
          />
          <Skeleton className="mt-3 h-5 w-3/4" />
        </div>
      ))}
    </div>
  );
}
