import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaAsset, Movie } from '../src/types/catalog';

const apiMocks = vi.hoisted(() => ({
  deleteAdminImage: vi.fn(),
  importAdminImage: vi.fn(),
  uploadAdminImage: vi.fn(),
}));

vi.mock('../src/lib/catalog-api', () => apiMocks);

import { MovieForm } from '../src/components/admin/MovieForm';

const movie: Movie = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Example Movie',
  description: 'A sufficiently long movie description for form validation.',
  posterUrl: '/posters/example.svg',
  bannerUrl: null,
  genres: ['Drama'],
  languages: ['Hindi'],
  durationMin: 120,
  certificate: 'U/A',
  rating: 8,
  releaseDate: '2026-07-15',
  status: 'draft',
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
};

const importedAsset: MediaAsset = {
  url: 'https://media.example.com/movies/posters/new.webp',
  key: 'movies/posters/00000000-0000-4000-8000-000000000002.webp',
  width: 800,
  height: 1200,
  contentType: 'image/webp',
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.importAdminImage.mockResolvedValue(importedAsset);
  apiMocks.deleteAdminImage.mockResolvedValue(undefined);
});

async function selectRemotePoster() {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('button', { name: 'Import from URL' })[0]!);
  await user.type(
    screen.getByRole('textbox', { name: /Direct HTTPS image URL/ }),
    'https://source.example.com/poster.jpg',
  );
  await user.click(screen.getByRole('button', { name: 'Use URL' }));
  return user;
}

describe('MovieForm media workflow', () => {
  it('imports changed images before saving the movie', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MovieForm loading={false} movie={movie} onCancel={vi.fn()} onSubmit={onSubmit} />);
    const user = await selectRemotePoster();

    await user.click(screen.getByRole('button', { name: 'Save movie' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(apiMocks.importAdminImage).toHaveBeenCalledWith(
      'https://source.example.com/poster.jpg',
      'poster',
    );
    expect(apiMocks.importAdminImage.mock.invocationCallOrder[0]).toBeLessThan(
      onSubmit.mock.invocationCallOrder[0],
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        posterUrl: importedAsset.url,
        posterAssetKey: importedAsset.key,
      }),
    );
  });

  it('deletes a newly imported object when the movie mutation fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Database unavailable'));
    render(<MovieForm loading={false} movie={movie} onCancel={vi.fn()} onSubmit={onSubmit} />);
    const user = await selectRemotePoster();

    await user.click(screen.getByRole('button', { name: 'Save movie' }));

    await waitFor(() => expect(apiMocks.deleteAdminImage).toHaveBeenCalledWith(importedAsset.key));
    expect(screen.getByRole('alert')).toHaveTextContent('Database unavailable');
  });
});
