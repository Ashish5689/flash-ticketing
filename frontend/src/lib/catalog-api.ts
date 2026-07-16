import type {
  Movie,
  MovieInput,
  MediaAsset,
  MediaKind,
  OrganizerApplication,
  Screen,
  ScreenLayout,
  MovieShowtimes,
  OrganizerShow,
  ShowSeatMap,
  ShowStatus,
  SeatTier,
  Theater,
} from '../types/catalog';
import { apiRequest } from './api';

const queryString = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const value = query.toString();
  return value ? `?${value}` : '';
};

export async function getMovies(
  filters: { q?: string; genre?: string; language?: string; city?: string } = {},
) {
  return (await apiRequest<{ movies: Movie[] }>(`/movies${queryString(filters)}`)).movies;
}

export function getMovieFacets() {
  return apiRequest<{ genres: string[]; languages: string[]; cities: string[] }>('/movies/facets');
}

export async function getMovie(id: string) {
  return (await apiRequest<{ movie: Movie }>(`/movies/${id}`)).movie;
}

export async function getAdminMovies(filters: { q?: string; status?: string } = {}) {
  return (await apiRequest<{ movies: Movie[] }>(`/admin/movies${queryString(filters)}`)).movies;
}

export async function createAdminMovie(input: MovieInput) {
  return (
    await apiRequest<{ movie: Movie }>('/admin/movies', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).movie;
}

export async function updateAdminMovie(id: string, input: Partial<MovieInput>) {
  return (
    await apiRequest<{ movie: Movie }>(`/admin/movies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ).movie;
}

export function deleteAdminMovie(id: string) {
  return apiRequest<void>(`/admin/movies/${id}`, { method: 'DELETE' });
}

export async function uploadAdminImage(file: Blob, kind: MediaKind) {
  const body = new FormData();
  body.set('file', file, `${kind}.webp`);
  body.set('kind', kind);
  return (
    await apiRequest<{ asset: MediaAsset }>('/admin/media/images/upload', {
      method: 'POST',
      body,
    })
  ).asset;
}

export async function importAdminImage(sourceUrl: string, kind: MediaKind) {
  return (
    await apiRequest<{ asset: MediaAsset }>('/admin/media/images/import', {
      method: 'POST',
      body: JSON.stringify({ sourceUrl, kind }),
    })
  ).asset;
}

export function deleteAdminImage(key: string) {
  return apiRequest<void>('/admin/media/images', {
    method: 'DELETE',
    body: JSON.stringify({ key }),
  });
}

export async function getMyOrganizerApplication() {
  return (await apiRequest<{ application: OrganizerApplication | null }>('/organizer/application'))
    .application;
}

export async function applyAsOrganizer(input: {
  businessName: string;
  phone: string;
  documents: string[];
}) {
  return (
    await apiRequest<{ application: OrganizerApplication }>('/organizer/apply', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).application;
}

export async function getOrganizerApplications(status?: string) {
  return (
    await apiRequest<{ applications: OrganizerApplication[] }>(
      `/admin/organizers${queryString({ status })}`,
    )
  ).applications;
}

export async function reviewOrganizerApplication(id: string, decision: 'approve' | 'reject') {
  return (
    await apiRequest<{ application: OrganizerApplication }>(`/admin/organizers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    })
  ).application;
}

export async function getTheaters() {
  return (await apiRequest<{ theaters: Theater[] }>('/organizer/theaters')).theaters;
}

export async function createTheater(input: { name: string; city: string; address: string }) {
  return (
    await apiRequest<{ theater: Theater }>('/organizer/theaters', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).theater;
}

export async function updateTheater(
  id: string,
  input: Partial<Pick<Theater, 'name' | 'city' | 'address' | 'status'>>,
) {
  return (
    await apiRequest<{ theater: Theater }>(`/organizer/theaters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ).theater;
}

export function deleteTheater(id: string) {
  return apiRequest<void>(`/organizer/theaters/${id}`, { method: 'DELETE' });
}

export async function createScreen(
  theaterId: string,
  input: { name: string; layout: ScreenLayout },
) {
  return (
    await apiRequest<{ screen: Screen }>(`/organizer/theaters/${theaterId}/screens`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).screen;
}

export async function updateScreen(id: string, input: { name: string; layout: ScreenLayout }) {
  return (
    await apiRequest<{ screen: Screen }>(`/organizer/screens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ).screen;
}

export function deleteScreen(id: string) {
  return apiRequest<void>(`/organizer/screens/${id}`, { method: 'DELETE' });
}

export async function getOrganizerShows(status?: ShowStatus) {
  return (
    await apiRequest<{ shows: OrganizerShow[] }>(`/organizer/shows${queryString({ status })}`)
  ).shows;
}

export async function createOrganizerShow(input: {
  movieId: string;
  screenId: string;
  startsAt: string;
  pricing: Array<{ tier: SeatTier; priceCents: number }>;
}) {
  return (
    await apiRequest<{ show: OrganizerShow }>('/organizer/shows', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).show;
}

export function publishOrganizerShow(id: string) {
  return apiRequest<{ show: OrganizerShow & { seatCount: number } }>(
    `/organizer/shows/${id}/publish`,
    { method: 'POST' },
  );
}

export function cancelOrganizerShow(id: string) {
  return apiRequest<{ show: OrganizerShow }>(`/organizer/shows/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled' }),
  });
}

export async function getMovieShowtimes(movieId: string, filters: { city: string; date: string }) {
  return apiRequest<MovieShowtimes>(`/movies/${movieId}/showtimes${queryString(filters)}`);
}

export async function getShowCities() {
  return (await apiRequest<{ cities: string[] }>('/shows/cities')).cities;
}

export function getShowSeatMap(showId: string) {
  return apiRequest<ShowSeatMap>(`/shows/${showId}/seats`);
}
