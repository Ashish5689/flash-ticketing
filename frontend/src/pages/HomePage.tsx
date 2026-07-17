import { useMemo, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { EventCard, MovieCard } from '../components/catalog/MovieCard';
import { CatalogShell } from '../components/layout/CatalogShell';
import { Button, Skeleton } from '../components/ui';
import { addDays, localDateValue } from '../lib/catalog-date';
import { getMovies } from '../lib/catalog-api';
import { useCatalogStore } from '../stores/catalogStore';
import type { Movie } from '../types/catalog';

const emptyMovies: Movie[] = [];

export default function HomePage() {
  const navigate = useNavigate();
  const city = useCatalogStore((state) => state.city);
  const today = localDateValue();
  const weekEnd = addDays(today, 6);
  const allQuery = useQuery({ queryKey: ['movies'], queryFn: () => getMovies() });
  const cityQuery = useQuery({
    queryKey: ['movies', 'city', city, today, weekEnd],
    queryFn: () => getMovies({ city, dateFrom: today, dateTo: weekEnd }),
  });
  const tomorrow = addDays(today, 1);
  const weekendEnd = addDays(today, 3);
  const catalog = allQuery.data ?? emptyMovies;
  const available = cityQuery.data ?? emptyMovies;
  const { nowShowing, events, comingSoon } = useMemo(() => {
    const cityIds = new Set(available.map((item) => item.id));
    const movies = catalog.filter((item) => item.contentType === 'movie');
    return {
      nowShowing: movies.filter((movie) => movie.releaseDate <= today && cityIds.has(movie.id)),
      events: catalog.filter((item) => item.contentType === 'event' && cityIds.has(item.id)),
      comingSoon: movies.filter((movie) => movie.releaseDate > today),
    };
  }, [available, catalog, today]);
  const featured =
    nowShowing.find((movie) => movie.title === 'Monsoon Protocol') ??
    nowShowing.find((movie) => movie.bannerUrl) ??
    nowShowing[0] ??
    catalog[0];

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('q')).trim();
    const params = new URLSearchParams({ city });
    if (query) params.set('q', query);
    navigate(`/movies?${params}`);
  };

  return (
    <CatalogShell>
      <main className="flex-1 bg-surface" id="top">
        <section className="bg-surface-dark px-5 pb-8 pt-5 text-brand-contrast sm:px-8">
          <div className="mx-auto max-w-content">
            <form className="relative" onSubmit={search}>
              <SearchIcon />
              <input
                aria-label="Search movies, events, languages, or venues"
                className="min-h-12 w-full rounded-lg border border-brand-contrast/15 bg-foreground pl-12 pr-28 text-sm text-brand-contrast placeholder:text-brand-contrast/55 focus:border-brand"
                name="q"
                placeholder="Search movies, events, languages or venues"
              />
              <Button className="absolute right-1.5 top-1.5 min-h-9 px-5" size="sm" type="submit">
                Search
              </Button>
            </form>
            <div
              className="mt-4 flex gap-2 overflow-x-auto pb-1"
              aria-label="Quick discovery filters"
            >
              <QuickFilter label="Today" to={dateLink(today, today, city)} active />
              <QuickFilter label="Tomorrow" to={dateLink(tomorrow, tomorrow, city)} />
              <QuickFilter label="This weekend" to={dateLink(today, weekendEnd, city)} />
              <QuickFilter
                label="Hindi"
                to={`/movies?language=Hindi&city=${encodeURIComponent(city)}`}
              />
              <QuickFilter
                label="English"
                to={`/movies?language=English&city=${encodeURIComponent(city)}`}
              />
            </div>
          </div>
        </section>

        <section className="px-5 pb-8 sm:px-8">
          <div className="mx-auto max-w-content">
            {allQuery.isLoading || cityQuery.isLoading ? <HeroSkeleton /> : null}
            {allQuery.isError || cityQuery.isError ? (
              <CatalogError
                onRetry={() => void Promise.all([allQuery.refetch(), cityQuery.refetch()])}
              />
            ) : null}
            {featured ? <FeaturedHero movie={featured} /> : null}
          </div>
        </section>

        <CatalogRail
          emptyMessage={`No movies are on sale in ${city} yet.`}
          items={nowShowing}
          title={`Now showing in ${city}`}
          to={`/movies?contentType=movie&city=${encodeURIComponent(city)}`}
        />

        {events.length ? (
          <section className="px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-content">
              <SectionHeading
                title="Live this week"
                to={`/movies?contentType=event&city=${encodeURIComponent(city)}`}
              />
              <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
                {events.map((event) => (
                  <EventCard event={event} key={event.id} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {comingSoon.length ? (
          <CatalogRail items={comingSoon} title="Coming soon" to="/movies?contentType=movie" />
        ) : null}
      </main>
    </CatalogShell>
  );
}

function FeaturedHero({ movie }: { movie: Movie }) {
  return (
    <article className="relative mt-7 min-h-[19rem] overflow-hidden rounded-xl bg-surface-dark text-brand-contrast shadow-md sm:min-h-[20rem]">
      <img
        alt={`${movie.title} featured banner`}
        className="absolute inset-0 size-full object-cover"
        src={movie.bannerUrl ?? movie.posterUrl}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-surface-dark via-surface-dark/80 to-transparent" />
      <div className="relative flex min-h-[19rem] max-w-2xl flex-col justify-center p-7 sm:min-h-[20rem] sm:p-10">
        <h1 className="text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl">
          {movie.title}
        </h1>
        <p className="mt-4 text-sm font-semibold text-brand-contrast/80">
          {movie.genres.join(' · ')} · {movie.languages.join(', ')} · ★ {movie.rating.toFixed(1)}/10
        </p>
        <p className="mt-4 line-clamp-3 max-w-lg text-sm leading-6 text-brand-contrast/78 sm:text-base">
          {movie.description}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-12 items-center rounded-lg bg-brand px-6 text-sm font-bold hover:bg-brand-hover"
            to={`/movies/${movie.id}#showtimes`}
          >
            Book tickets
          </Link>
          <Link
            className="inline-flex min-h-12 items-center rounded-lg border border-brand-contrast/55 px-6 text-sm font-bold hover:bg-brand-contrast/10"
            to={`/movies/${movie.id}`}
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

function CatalogRail({
  title,
  to,
  items,
  emptyMessage,
}: {
  title: string;
  to: string;
  items: Movie[];
  emptyMessage?: string;
}) {
  return (
    <section className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-content">
        <SectionHeading title={title} to={to} />
        {items.length ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {items.slice(0, 5).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center text-sm text-muted">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
}

function SectionHeading({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
      <Link className="shrink-0 text-sm font-bold text-brand hover:text-brand-hover" to={to}>
        See all <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function QuickFilter({
  label,
  to,
  active = false,
}: {
  label: string;
  to: string;
  active?: boolean;
}) {
  return (
    <Link
      className={
        active
          ? 'shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-bold'
          : 'shrink-0 rounded-lg border border-brand-contrast/20 px-4 py-2 text-sm font-semibold text-brand-contrast/85 hover:border-brand-contrast/50'
      }
      to={to}
    >
      {label}
    </Link>
  );
}

function dateLink(dateFrom: string, dateTo: string, city: string) {
  return `/movies?${new URLSearchParams({ dateFrom, dateTo, city })}`;
}

function HeroSkeleton() {
  return <Skeleton className="mt-7 min-h-[20rem] w-full rounded-xl bg-border" />;
}

function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-7 rounded-xl border border-brand/25 bg-brand-soft p-6 text-center">
      <p className="font-bold">The catalog could not be loaded.</p>
      <button
        className="mt-3 text-sm font-bold text-brand underline"
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand-contrast/65"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
