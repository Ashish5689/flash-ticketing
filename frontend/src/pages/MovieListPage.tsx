import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { MovieCard } from '../components/catalog/MovieCard';
import { CatalogShell } from '../components/layout/CatalogShell';
import { Input, Select, Spinner } from '../components/ui';
import { getMovieFacets, getMovies } from '../lib/catalog-api';

export default function MovieListPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const deferredSearch = useDeferredValue(search);
  const language = params.get('language') ?? '';
  const genre = params.get('genre') ?? '';
  const city = params.get('city') ?? '';
  const facetsQuery = useQuery({ queryKey: ['movie-facets'], queryFn: getMovieFacets });
  const moviesQuery = useQuery({
    queryKey: ['movies', deferredSearch, language, genre, city],
    queryFn: () =>
      getMovies({
        q: deferredSearch || undefined,
        language: language || undefined,
        genre: genre || undefined,
        city: city || undefined,
      }),
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <CatalogShell>
      <main className="mx-auto w-full max-w-content flex-1 px-5 py-10 sm:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">Movies</h1>
          <p className="mt-3 text-muted">Browse every published movie in the catalog.</p>
        </div>
        <div className="mt-8 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_12rem]">
          <Input
            aria-label="Search movie catalog"
            onChange={(event) => {
              setSearch(event.target.value);
              setFilter('q', event.target.value);
            }}
            placeholder="Search by title"
            value={search}
          />
          <Select
            aria-label="Filter by language"
            onChange={(event) => setFilter('language', event.target.value)}
            value={language}
          >
            <option value="">All languages</option>
            {facetsQuery.data?.languages.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter by genre"
            onChange={(event) => setFilter('genre', event.target.value)}
            value={genre}
          >
            <option value="">All genres</option>
            {facetsQuery.data?.genres.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter by city"
            onChange={(event) => setFilter('city', event.target.value)}
            value={city}
          >
            <option value="">All cities</option>
            {facetsQuery.data?.cities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </div>
        {moviesQuery.isLoading ? (
          <div className="grid min-h-80 place-items-center">
            <Spinner label="Loading catalog" />
          </div>
        ) : null}
        {moviesQuery.isError ? (
          <p className="mt-8 rounded bg-brand-soft p-4 text-brand">
            The movie catalog could not be loaded.
          </p>
        ) : null}
        {moviesQuery.data?.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
            <h2 className="text-xl font-bold">No movies found</h2>
            <p className="mt-2 text-sm text-muted">Try another title, language, or genre.</p>
          </div>
        ) : null}
        {moviesQuery.data && moviesQuery.data.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
            {moviesQuery.data.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : null}
      </main>
    </CatalogShell>
  );
}
