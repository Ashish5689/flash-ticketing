import { and, arrayContains, asc, desc, eq, ilike, type SQL } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { movies } from '../../db/schema/movies.js';
import { shows } from '../../db/schema/shows.js';
import { screens, theaters } from '../../db/schema/theaters.js';
import { assertManagedAssetUrl, deleteManagedAssetsBestEffort } from '../media/media.service.js';
import { AppError } from '../../shared/errors.js';
import type { z } from 'zod';
import type { movieInputSchema, movieListQuerySchema, movieUpdateSchema } from './movie.schemas.js';

type MovieInput = z.infer<typeof movieInputSchema>;
type MovieUpdate = z.infer<typeof movieUpdateSchema>;
type MovieQuery = z.infer<typeof movieListQuerySchema>;

const movieResponseSelection = {
  id: movies.id,
  title: movies.title,
  contentType: movies.contentType,
  description: movies.description,
  posterUrl: movies.posterUrl,
  bannerUrl: movies.bannerUrl,
  genres: movies.genres,
  languages: movies.languages,
  durationMin: movies.durationMin,
  certificate: movies.certificate,
  rating: movies.rating,
  releaseDate: movies.releaseDate,
  status: movies.status,
  createdAt: movies.createdAt,
  updatedAt: movies.updatedAt,
};

function filters(query: MovieQuery, publicOnly: boolean) {
  const conditions: SQL[] = [];
  if (publicOnly) conditions.push(eq(movies.status, 'published'));
  else if (query.status) conditions.push(eq(movies.status, query.status));
  if (query.q) conditions.push(ilike(movies.title, `%${query.q}%`));
  if (query.contentType) conditions.push(eq(movies.contentType, query.contentType));
  if (query.genre) conditions.push(arrayContains(movies.genres, [query.genre]));
  if (query.language) conditions.push(arrayContains(movies.languages, [query.language]));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function listMovies(query: MovieQuery, publicOnly = true) {
  if (publicOnly && query.city) {
    return db
      .selectDistinct(movieResponseSelection)
      .from(movies)
      .innerJoin(shows, eq(shows.movieId, movies.id))
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theaters, eq(screens.theaterId, theaters.id))
      .where(
        and(
          filters(query, true),
          eq(shows.status, 'onsale'),
          eq(theaters.status, 'active'),
          ilike(theaters.city, query.city),
        ),
      )
      .orderBy(desc(movies.releaseDate), asc(movies.title));
  }
  return db
    .select(movieResponseSelection)
    .from(movies)
    .where(filters(query, publicOnly))
    .orderBy(desc(movies.releaseDate), asc(movies.title));
}

export async function movieFacets() {
  const [catalog, cityRows] = await Promise.all([
    db
      .select({ genres: movies.genres, languages: movies.languages })
      .from(movies)
      .where(eq(movies.status, 'published')),
    db
      .selectDistinct({ city: theaters.city })
      .from(shows)
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theaters, eq(screens.theaterId, theaters.id))
      .where(and(eq(shows.status, 'onsale'), eq(theaters.status, 'active')))
      .orderBy(asc(theaters.city)),
  ]);
  return {
    genres: [...new Set(catalog.flatMap((movie) => movie.genres))].sort(),
    languages: [...new Set(catalog.flatMap((movie) => movie.languages))].sort(),
    cities: cityRows.map(({ city }) => city),
  };
}

export async function getMovie(id: string, publicOnly = true) {
  const condition = publicOnly
    ? and(eq(movies.id, id), eq(movies.status, 'published'))
    : eq(movies.id, id);
  const [movie] = await db.select(movieResponseSelection).from(movies).where(condition).limit(1);
  if (!movie) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Movie was not found');
  return movie;
}

export async function createMovie(input: MovieInput, createdBy: string) {
  assertManagedAssetUrl(input.posterUrl, input.posterAssetKey ?? null, 'poster');
  if (input.bannerUrl) {
    assertManagedAssetUrl(input.bannerUrl, input.bannerAssetKey ?? null, 'banner');
  } else if (input.bannerAssetKey) {
    throw new AppError(400, 'INVALID_MEDIA_ASSET', 'A banner asset key requires a banner URL');
  }
  const [movie] = await db
    .insert(movies)
    .values({
      ...input,
      posterAssetKey: input.posterAssetKey ?? null,
      bannerUrl: input.bannerUrl ?? null,
      bannerAssetKey: input.bannerAssetKey ?? null,
      createdBy,
    })
    .returning(movieResponseSelection);
  if (!movie) throw new Error('Failed to create movie');
  return movie;
}

export async function updateMovie(id: string, input: MovieUpdate) {
  const [existing] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  if (!existing) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Movie was not found');

  const posterUrl = input.posterUrl ?? existing.posterUrl;
  const posterAssetKey = Object.hasOwn(input, 'posterAssetKey')
    ? (input.posterAssetKey ?? null)
    : input.posterUrl && input.posterUrl !== existing.posterUrl
      ? null
      : existing.posterAssetKey;
  const bannerUrl = Object.hasOwn(input, 'bannerUrl')
    ? (input.bannerUrl ?? null)
    : existing.bannerUrl;
  const bannerAssetKey = Object.hasOwn(input, 'bannerAssetKey')
    ? (input.bannerAssetKey ?? null)
    : Object.hasOwn(input, 'bannerUrl') && bannerUrl !== existing.bannerUrl
      ? null
      : existing.bannerAssetKey;

  assertManagedAssetUrl(posterUrl, posterAssetKey, 'poster');
  if (bannerUrl) assertManagedAssetUrl(bannerUrl, bannerAssetKey, 'banner');
  else if (bannerAssetKey) {
    throw new AppError(400, 'INVALID_MEDIA_ASSET', 'A banner asset key requires a banner URL');
  }

  const [movie] = await db
    .update(movies)
    .set({ ...input, posterAssetKey, bannerAssetKey, updatedAt: new Date() })
    .where(eq(movies.id, id))
    .returning(movieResponseSelection);
  if (!movie) throw new Error('Failed to update movie');

  const replacedKeys = [
    existing.posterAssetKey && existing.posterAssetKey !== posterAssetKey
      ? existing.posterAssetKey
      : null,
    existing.bannerAssetKey && existing.bannerAssetKey !== bannerAssetKey
      ? existing.bannerAssetKey
      : null,
  ];
  await deleteManagedAssetsBestEffort(replacedKeys);
  return movie;
}

export async function deleteMovie(id: string) {
  const [scheduledShow] = await db
    .select({ id: shows.id })
    .from(shows)
    .where(eq(shows.movieId, id))
    .limit(1);
  if (scheduledShow) {
    throw new AppError(
      409,
      'MOVIE_HAS_SHOWS',
      'Archive this movie instead; movies with show history cannot be deleted',
    );
  }
  const [movie] = await db.delete(movies).where(eq(movies.id, id)).returning({
    id: movies.id,
    posterAssetKey: movies.posterAssetKey,
    bannerAssetKey: movies.bannerAssetKey,
  });
  if (!movie) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Movie was not found');
  await deleteManagedAssetsBestEffort([movie.posterAssetKey, movie.bannerAssetKey]);
}
