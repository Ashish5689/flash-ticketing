import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Button, Skeleton } from '../components/ui';
import { formatDateChip, localDateValue } from '../lib/catalog-date';
import { getMovie, getMovieShowDates, getMovieShowtimes, getShowCities } from '../lib/catalog-api';
import { formatDuration } from '../lib/catalog-format';
import { useCatalogStore } from '../stores/catalogStore';
import type { Movie } from '../types/catalog';

export default function MovieDetailPage() {
  const { id = '' } = useParams();
  const movieQuery = useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovie(id),
    enabled: Boolean(id),
  });

  return (
    <CatalogShell>
      <main className="flex-1 bg-surface">
        {movieQuery.isLoading ? <DetailSkeleton /> : null}
        {movieQuery.isError ? (
          <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
            <h1 className="text-3xl font-extrabold">Listing not found</h1>
            <p className="mt-3 text-muted">This title is unavailable or no longer published.</p>
            <Link className="mt-6 inline-block font-bold text-brand" to="/movies">
              Back to discovery
            </Link>
          </div>
        ) : null}
        {movieQuery.data ? <MovieDetails movie={movieQuery.data} /> : null}
      </main>
    </CatalogShell>
  );
}

function MovieDetails({ movie }: { movie: Movie }) {
  const isEvent = movie.contentType === 'event';
  return (
    <>
      <section className="relative overflow-hidden bg-surface-dark text-brand-contrast">
        {movie.bannerUrl ? (
          <img alt="" className="absolute inset-0 size-full object-cover" src={movie.bannerUrl} />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-surface-dark via-surface-dark/90 to-surface-dark/30" />
        <div className="relative mx-auto grid max-w-content gap-8 px-5 py-10 sm:px-8 md:grid-cols-[13rem_1fr] md:items-center lg:py-16">
          <img
            alt={`${movie.title} poster`}
            className="hidden aspect-[2/3] w-full rounded-xl object-cover shadow-md md:block"
            src={movie.posterUrl}
          />
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand">
              {isEvent ? 'Live event' : 'Now showing'}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
              {movie.title}
            </h1>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-brand-contrast/85">
              <span>★ {movie.rating.toFixed(1)}/10</span>
              <span>{formatDuration(movie.durationMin)}</span>
              <span>{movie.languages.join(', ')}</span>
              <span>{movie.certificate}</span>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-brand-contrast/82">
              {movie.description}
            </p>
            <a className="mt-8 inline-flex" href="#showtimes">
              <Button size="lg">Book tickets</Button>
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-10 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h2 className="text-2xl font-extrabold">About this {isEvent ? 'event' : 'movie'}</h2>
            <p className="mt-4 text-sm font-semibold text-muted">{movie.genres.join(' · ')}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Release date</dt>
              <dd className="mt-1 font-bold">{formatReleaseDate(movie.releaseDate)}</dd>
            </div>
            <div>
              <dt className="text-muted">Languages</dt>
              <dd className="mt-1 font-bold">{movie.languages.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-muted">Certificate</dt>
              <dd className="mt-1 font-bold">{movie.certificate}</dd>
            </div>
          </dl>
        </div>
      </section>
      <ShowtimePicker movieId={movie.id} />
    </>
  );
}

function ShowtimePicker({ movieId }: { movieId: string }) {
  const city = useCatalogStore((state) => state.city);
  const setCity = useCatalogStore((state) => state.setCity);
  const today = localDateValue();
  const [date, setDate] = useState(today);
  const [autoSelectedFor, setAutoSelectedFor] = useState('');
  const citiesQuery = useQuery({ queryKey: ['show-cities'], queryFn: getShowCities });
  const datesQuery = useQuery({
    queryKey: ['movie-show-dates', movieId, city, today],
    queryFn: () => getMovieShowDates(movieId, { city, from: today, days: '7' }),
  });
  const showtimesQuery = useQuery({
    queryKey: ['movie-showtimes', movieId, city, date],
    queryFn: () => getMovieShowtimes(movieId, { city, date }),
  });
  const cities = citiesQuery.data?.length ? citiesQuery.data : [city];

  useEffect(() => {
    const key = `${movieId}:${city}:${today}`;
    if (autoSelectedFor === key || !datesQuery.data) return;
    const firstAvailable = datesQuery.data.dates.find((item) => item.showCount > 0)?.date;
    setDate(firstAvailable ?? today);
    setAutoSelectedFor(key);
  }, [autoSelectedFor, city, datesQuery.data, movieId, today]);

  const selectedShows = useMemo(
    () =>
      showtimesQuery.data?.theaters.reduce((total, theater) => total + theater.shows.length, 0) ??
      0,
    [showtimesQuery.data],
  );

  return (
    <section className="border-t border-border bg-background px-5 py-10 sm:px-8" id="showtimes">
      <div className="mx-auto max-w-content">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Showtimes</h2>
            <p className="mt-2 text-sm text-muted">Choose a cinema and time in {city}.</p>
          </div>
          <label className="grid min-w-48 gap-2 text-sm font-semibold">
            City
            <select
              className="min-h-11 rounded-lg border border-border bg-surface px-3"
              onChange={(event) => setCity(event.target.value)}
              value={city}
            >
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {datesQuery.isLoading ? (
          <div className="mt-6 flex gap-3">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton className="h-20 w-20" key={index} />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2" aria-label="Available show dates">
            {datesQuery.data?.dates.map((item) => (
              <DateChip
                date={item.date}
                key={item.date}
                onClick={() => setDate(item.date)}
                selected={date === item.date}
                showCount={item.showCount}
              />
            ))}
          </div>
        )}

        {showtimesQuery.isLoading ? <ShowtimeSkeleton /> : null}
        {showtimesQuery.isError ? (
          <div className="mt-6 rounded-xl border border-brand/25 bg-brand-soft p-5">
            <p className="font-bold">Showtimes could not be loaded.</p>
            <button
              className="mt-2 text-sm font-bold text-brand underline"
              onClick={() => void showtimesQuery.refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
        {!showtimesQuery.isLoading && !showtimesQuery.isError && selectedShows === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-surface p-8 text-center">
            <h3 className="font-bold">No shows available</h3>
            <p className="mt-2 text-sm text-muted">Choose another highlighted date or city.</p>
          </div>
        ) : null}
        <div className="mt-6 grid gap-4">
          {showtimesQuery.data?.theaters.map(({ theater, shows }) => (
            <article
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
              key={theater.id}
            >
              <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-extrabold">{theater.name}</h3>
                  <p className="mt-1 text-sm text-muted">{theater.address}</p>
                </div>
                <span className="text-xs font-semibold text-success">M-ticket available</span>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                {shows.map((show) => {
                  const lowestPrice = Math.min(...show.pricing.map((price) => price.priceCents));
                  return (
                    <Link
                      className="min-w-36 rounded-lg border border-seat-available bg-surface px-4 py-3 text-center transition hover:border-brand hover:bg-brand-soft"
                      key={show.id}
                      to={`/shows/${show.id}/seats`}
                    >
                      <span className="block font-extrabold text-success">
                        {new Date(show.startsAt).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{show.screen.name}</span>
                      <span className="mt-1 block text-xs font-semibold">
                        from {formatRupees(lowestPrice)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DateChip({
  date,
  showCount,
  selected,
  onClick,
}: {
  date: string;
  showCount: number;
  selected: boolean;
  onClick: () => void;
}) {
  const formatted = formatDateChip(date);
  return (
    <button
      aria-pressed={selected}
      className={
        selected
          ? 'min-w-20 rounded-xl border border-brand bg-brand px-3 py-3 text-brand-contrast'
          : 'min-w-20 rounded-xl border border-border bg-surface px-3 py-3 hover:border-brand'
      }
      disabled={showCount === 0}
      onClick={onClick}
      type="button"
    >
      <span className="block text-xs font-semibold uppercase">{formatted.weekday}</span>
      <span className="mt-0.5 block text-xl font-extrabold">{formatted.day}</span>
      <span className="block text-xs">{formatted.month}</span>
      <span
        className={
          selected
            ? 'mt-1 block text-[0.65rem] text-brand-contrast/75'
            : 'mt-1 block text-[0.65rem] text-muted'
        }
      >
        {showCount ? `${showCount} shows` : 'No shows'}
      </span>
    </button>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="min-h-[31rem] w-full rounded-none bg-surface-dark/80" />
      <div className="mx-auto max-w-content px-5 py-10 sm:px-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-5 h-20 w-full max-w-3xl" />
      </div>
    </>
  );
}

function ShowtimeSkeleton() {
  return (
    <div className="mt-6 grid gap-4">
      {Array.from({ length: 2 }, (_, index) => (
        <Skeleton className="h-36 rounded-xl" key={index} />
      ))}
    </div>
  );
}

function formatReleaseDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRupees(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}
