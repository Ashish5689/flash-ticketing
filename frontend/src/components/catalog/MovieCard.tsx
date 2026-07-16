import { Link } from 'react-router-dom';

import { formatDuration } from '../../lib/catalog-format';
import type { Movie } from '../../types/catalog';

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition duration-base hover:-translate-y-1 hover:shadow-md">
      <Link className="block overflow-hidden" to={`/movies/${movie.id}`}>
        <img
          alt={`${movie.title} poster`}
          className="aspect-[2/3] w-full object-cover transition duration-base group-hover:scale-[1.02]"
          loading="lazy"
          src={movie.posterUrl}
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-2 w-fit rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold capitalize text-brand">
          {movie.contentType}
        </span>
        <h3 className="line-clamp-2 text-base font-bold leading-6">{movie.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-muted">{movie.genres.join(', ')}</p>
        <p className="mt-2 text-xs text-muted">{movie.languages.join(' · ')}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>{formatDuration(movie.durationMin)}</span>
          <span
            aria-label={`Rating ${movie.rating} out of 10`}
            className="font-semibold text-foreground"
          >
            ★ {movie.rating.toFixed(1)}
          </span>
        </div>
        <Link
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded bg-brand px-4 text-sm font-semibold text-brand-contrast transition duration-fast hover:bg-brand-hover"
          to={`/movies/${movie.id}`}
        >
          View showtimes
        </Link>
      </div>
    </article>
  );
}
