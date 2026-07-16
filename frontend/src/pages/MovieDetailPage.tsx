import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Badge, Button, Spinner } from '../components/ui';
import { getMovie, getMovieShowtimes, getShowCities } from '../lib/catalog-api';
import { formatDuration } from '../lib/catalog-format';
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
      <main className="flex-1">
        {movieQuery.isLoading ? (
          <div className="grid min-h-[32rem] place-items-center">
            <Spinner label="Loading movie" />
          </div>
        ) : null}
        {movieQuery.isError ? (
          <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
            <h1 className="text-3xl font-bold">Movie not found</h1>
            <p className="mt-3 text-muted">This title is unavailable or no longer published.</p>
            <Link className="mt-6 inline-block font-semibold text-brand" to="/movies">
              Back to movies
            </Link>
          </div>
        ) : null}
        {movieQuery.data ? <MovieDetails movie={movieQuery.data} /> : null}
      </main>
    </CatalogShell>
  );
}

function MovieDetails({ movie }: { movie: Movie }) {
  return (
    <>
      <section className="bg-surface-dark text-brand-contrast">
        <div className="mx-auto grid max-w-content gap-8 px-5 py-10 sm:px-8 md:grid-cols-[16rem_1fr] md:items-center lg:py-14">
          <img
            alt={`${movie.title} poster`}
            className="mx-auto aspect-[2/3] w-full max-w-64 rounded-lg object-cover shadow-md md:mx-0"
            src={movie.posterUrl}
          />
          <div className="max-w-2xl">
            <Badge className="bg-brand-soft text-brand">{movie.certificate}</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{movie.title}</h1>
            <p className="mt-5 text-base leading-7 text-brand-contrast">{movie.description}</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-contrast">
              <span>★ {movie.rating.toFixed(1)}/10</span>
              <span>{formatDuration(movie.durationMin)}</span>
              <span>{movie.languages.join(', ')}</span>
              <span>{movie.genres.join(', ')}</span>
            </div>
            <a className="mt-8 inline-flex" href="#showtimes">
              <Button size="lg">View showtimes</Button>
            </a>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-content px-5 py-10 sm:px-8">
        <h2 className="text-2xl font-bold">About the movie</h2>
        <p className="mt-4 max-w-3xl leading-7 text-muted">{movie.description}</p>
        <p className="mt-5 text-sm text-muted">
          Released{' '}
          {new Date(`${movie.releaseDate}T00:00:00`).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </section>
      <ShowtimePicker movieId={movie.id} />
    </>
  );
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatRupees(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

function ShowtimePicker({ movieId }: { movieId: string }) {
  const [city, setCity] = useState('Mumbai');
  const [date, setDate] = useState(() => localDateValue());
  const citiesQuery = useQuery({ queryKey: ['show-cities'], queryFn: getShowCities });
  const showtimesQuery = useQuery({
    queryKey: ['movie-showtimes', movieId, city, date],
    queryFn: () => getMovieShowtimes(movieId, { city, date }),
  });
  const cities = citiesQuery.data?.length ? citiesQuery.data : ['Mumbai', 'Bengaluru', 'Delhi NCR'];

  return (
    <section className="border-t border-border bg-surface px-5 py-10 sm:px-8" id="showtimes">
      <div className="mx-auto max-w-content">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Showtimes</h2>
            <p className="mt-2 text-sm text-muted">Choose a cinema and time to view its seats.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              City
              <select
                className="min-h-11 rounded border border-border bg-surface px-3"
                onChange={(event) => setCity(event.target.value)}
                value={city}
              >
                {cities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Date
              <input
                className="min-h-11 rounded border border-border bg-surface px-3"
                min={localDateValue()}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </label>
          </div>
        </div>

        {showtimesQuery.isLoading ? (
          <div className="grid min-h-48 place-items-center">
            <Spinner label="Loading showtimes" />
          </div>
        ) : null}
        {showtimesQuery.isError ? (
          <p className="mt-6 rounded bg-brand-soft p-4 text-sm text-brand">
            Showtimes could not be loaded.
          </p>
        ) : null}
        {showtimesQuery.data?.theaters.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-background p-8 text-center">
            <h3 className="font-bold">No shows on this date</h3>
            <p className="mt-2 text-sm text-muted">Try another date or city.</p>
          </div>
        ) : null}
        <div className="mt-6 grid gap-4">
          {showtimesQuery.data?.theaters.map(({ theater, shows }) => (
            <article className="rounded-lg border border-border bg-surface p-5" key={theater.id}>
              <div className="border-b border-border pb-4">
                <h3 className="font-bold">{theater.name}</h3>
                <p className="mt-1 text-sm text-muted">{theater.address}</p>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                {shows.map((show) => {
                  const lowestPrice = Math.min(...show.pricing.map((price) => price.priceCents));
                  return (
                    <Link
                      className="min-w-32 rounded border border-seat-available bg-surface px-4 py-3 text-center transition duration-fast hover:border-brand hover:bg-brand-soft"
                      key={show.id}
                      to={`/shows/${show.id}/seats`}
                    >
                      <span className="block font-bold text-success">
                        {new Date(show.startsAt).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {show.screen.name} · from {formatRupees(lowestPrice)}
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
