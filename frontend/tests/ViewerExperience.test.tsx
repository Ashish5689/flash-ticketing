import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EventCard, MovieCard } from '../src/components/catalog/MovieCard';
import { Navbar } from '../src/components/layout/Navbar';
import { addDays, formatDateChip } from '../src/lib/catalog-date';
import { useAuthStore } from '../src/stores/authStore';
import { useCatalogStore } from '../src/stores/catalogStore';
import type { Movie } from '../src/types/catalog';

const movie: Movie = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Monsoon Protocol',
  contentType: 'movie',
  description: 'A cybersecurity analyst races across Mumbai during a dangerous monsoon evening.',
  posterUrl: 'https://images.example.com/poster.webp',
  bannerUrl: 'https://images.example.com/banner.webp',
  genres: ['Thriller', 'Drama'],
  languages: ['Hindi'],
  durationMin: 132,
  certificate: 'U/A',
  rating: 8.4,
  releaseDate: '2026-07-16',
  status: 'published',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
};

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: null, user: null, status: 'anonymous' });
  useCatalogStore.setState({ city: 'Mumbai' });
});

describe('viewer experience components', () => {
  it('uses only working viewer navigation and Flash Ticketing branding', () => {
    render(
      <MemoryRouter initialEntries={['/movies?contentType=event']}>
        <Navbar onCityClick={() => undefined} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Flash Ticketing home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute(
      'href',
      '/movies?contentType=movie',
    );
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'href',
      '/movies?contentType=event',
    );
    expect(screen.queryByText('Plays')).not.toBeInTheDocument();
    expect(screen.queryByText('Sports')).not.toBeInTheDocument();
  });

  it('persists the selected catalog city', () => {
    useCatalogStore.getState().setCity('Delhi NCR');
    expect(useCatalogStore.getState().city).toBe('Delhi NCR');
    expect(localStorage.getItem('flash-ticketing-catalog-v1')).toContain('Delhi NCR');
  });

  it('renders distinct movie and event treatments', () => {
    const { rerender } = render(
      <MemoryRouter>
        <MovieCard movie={movie} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: 'Monsoon Protocol poster' })).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <EventCard event={{ ...movie, contentType: 'event' }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: 'Monsoon Protocol event banner' })).toHaveAttribute(
      'src',
      movie.bannerUrl,
    );
  });

  it('builds stable date chips across month boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(formatDateChip('2026-08-01')).toMatchObject({ day: '1', month: 'Aug' });
  });
});
