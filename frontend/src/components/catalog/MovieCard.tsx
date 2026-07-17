import { Link } from 'react-router-dom';

import { formatDuration } from '../../lib/catalog-format';
import type { Movie } from '../../types/catalog';

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <article className="group min-w-0">
      <Link className="block" to={`/movies/${movie.id}`}>
        <div className="relative overflow-hidden rounded-xl bg-surface-dark shadow-sm">
          <img
            alt={`${movie.title} poster`}
            className="aspect-[2/3] w-full object-cover transition duration-base group-hover:scale-[1.035]"
            loading="lazy"
            src={movie.posterUrl}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-surface-dark/90 px-3 py-2 text-xs text-brand-contrast">
            <span className="font-semibold">★ {movie.rating.toFixed(1)}</span>
            <span className="text-brand-contrast/70">{formatDuration(movie.durationMin)}</span>
          </div>
        </div>
        <h3 className="mt-3 line-clamp-1 text-sm font-bold leading-5 sm:text-base">
          {movie.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted sm:text-sm">
          {movie.genres.join(' · ')}
        </p>
      </Link>
    </article>
  );
}

export function EventCard({ event }: { event: Movie }) {
  return (
    <article className="group min-w-[17rem] flex-1 overflow-hidden rounded-xl bg-surface-dark text-brand-contrast shadow-sm">
      <Link className="block" to={`/movies/${event.id}`}>
        <div className="overflow-hidden">
          <img
            alt={`${event.title} event banner`}
            className="aspect-[16/8] w-full object-cover transition duration-base group-hover:scale-[1.03]"
            loading="lazy"
            src={event.bannerUrl ?? event.posterUrl}
          />
        </div>
        <div className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 font-bold">{event.title}</h3>
            <span className="shrink-0 text-xs font-semibold text-brand">
              ★ {event.rating.toFixed(1)}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-brand-contrast/65">
            {event.genres.join(' · ')} · {event.languages.join(', ')}
          </p>
        </div>
      </Link>
    </article>
  );
}
