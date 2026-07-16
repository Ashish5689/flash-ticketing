import { useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { MovieCard } from '../components/catalog/MovieCard';
import { CatalogShell } from '../components/layout/CatalogShell';
import { Button, Spinner } from '../components/ui';
import { getMovies } from '../lib/catalog-api';

const languageFilters = ['All', 'Hindi', 'English'] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<(typeof languageFilters)[number]>('All');
  const moviesQuery = useQuery({ queryKey: ['movies'], queryFn: () => getMovies() });
  const today = new Date().toISOString().slice(0, 10);
  const { nowShowing, comingSoon } = useMemo(() => {
    const visible = moviesQuery.data ?? [];
    return {
      nowShowing: visible.filter((movie) => movie.releaseDate <= today),
      comingSoon: visible.filter((movie) => movie.releaseDate > today),
    };
  }, [moviesQuery.data, today]);
  const filtered =
    language === 'All'
      ? nowShowing
      : nowShowing.filter((movie) => movie.languages.includes(language));

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('q')).trim();
    navigate(query ? `/movies?q=${encodeURIComponent(query)}` : '/movies');
  };

  return (
    <CatalogShell>
      <main className="flex-1" id="top">
        <section className="overflow-hidden bg-surface">
          <div className="mx-auto grid max-w-content gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:py-12">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                What do you want to watch?
              </h1>
              <p className="mt-4 text-lg text-muted">Discover movies playing near you.</p>
              <form className="relative mt-7 max-w-xl" onSubmit={search}>
                <SearchIcon />
                <input
                  aria-label="Search movies"
                  className="min-h-14 w-full rounded-lg border border-border bg-surface pl-12 pr-28 text-base shadow-sm placeholder:text-muted focus:border-focus"
                  name="q"
                  placeholder="Search movies"
                />
                <Button className="absolute right-1.5 top-1.5" type="submit">
                  Search
                </Button>
              </form>
            </div>
            <PosterStage />
          </div>
        </section>

        <section className="border-t border-border px-5 py-10 sm:px-8" id="movies">
          <div className="mx-auto max-w-content">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Now showing</h2>
                <div className="flex gap-2" aria-label="Language filters">
                  {languageFilters.map((item) => (
                    <button
                      aria-pressed={language === item}
                      className={
                        language === item
                          ? 'min-h-9 rounded-full bg-brand px-4 text-sm font-semibold text-brand-contrast'
                          : 'min-h-9 rounded-full border border-border bg-surface px-4 text-sm font-medium text-muted hover:border-brand hover:text-brand'
                      }
                      key={item}
                      onClick={() => setLanguage(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <Link
                className="text-sm font-semibold text-brand hover:text-brand-hover"
                to="/movies"
              >
                See all movies
              </Link>
            </div>
            {moviesQuery.isLoading ? (
              <div className="grid min-h-72 place-items-center">
                <Spinner label="Loading movies" />
              </div>
            ) : null}
            {moviesQuery.isError ? (
              <p className="mt-8 rounded bg-brand-soft p-4 text-sm text-brand">
                The catalog could not be loaded. Please try again.
              </p>
            ) : null}
            {!moviesQuery.isLoading && filtered.length === 0 ? (
              <p className="mt-8 rounded border border-dashed border-border bg-surface p-8 text-center text-muted">
                No movies match this language yet.
              </p>
            ) : null}
            {filtered.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
                {filtered.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {comingSoon.length > 0 ? (
          <section className="border-t border-border bg-surface px-5 py-10 sm:px-8">
            <div className="mx-auto max-w-content">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Coming soon</h2>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
                {comingSoon.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </CatalogShell>
  );
}

function PosterStage() {
  return (
    <div
      aria-label="Featured movie posters"
      className="relative hidden h-80 overflow-hidden rounded-xl bg-surface-dark p-6 shadow-md lg:block"
    >
      <div className="absolute inset-x-10 bottom-0 top-7 flex items-end justify-center gap-4">
        <img
          alt="Kuberaa"
          className="h-64 w-44 -rotate-3 rounded-lg border border-muted object-cover shadow-md"
          src="/posters/kuberaa.png"
        />
        <img
          alt="Sitaare Zameen Par"
          className="z-10 h-72 w-48 rounded-lg border border-muted object-cover shadow-md"
          src="/posters/sitaare-zameen-par.png"
        />
        <img
          alt="Skybound"
          className="h-64 w-44 rotate-3 rounded-lg border border-muted object-cover shadow-md"
          src="/posters/skybound.png"
        />
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
