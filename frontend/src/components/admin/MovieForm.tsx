import { useState, type FormEvent } from 'react';

import { deleteAdminImage, importAdminImage, uploadAdminImage } from '../../lib/catalog-api';
import { Button, Input, Select, Textarea } from '../ui';
import type { MediaAsset, MediaKind, Movie, MovieInput } from '../../types/catalog';
import { ImagePickerField, type ImageSelection } from './ImagePickerField';

type ResolvedImage = { url: string | null; asset: MediaAsset | null };

async function resolveImage(selection: ImageSelection, kind: MediaKind): Promise<ResolvedImage> {
  if (selection.source === 'none') return { url: null, asset: null };
  if (selection.source === 'existing') return { url: selection.url, asset: null };
  const asset =
    selection.source === 'local'
      ? await uploadAdminImage(selection.blob, kind)
      : await importAdminImage(selection.url, kind);
  return { url: asset.url, asset };
}

async function cleanupStagedAssets(assets: MediaAsset[]) {
  await Promise.allSettled(assets.map((asset) => deleteAdminImage(asset.key)));
}

export function MovieForm({
  movie,
  loading,
  onCancel,
  onSubmit,
}: {
  movie?: Movie | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (input: MovieInput) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [poster, setPoster] = useState<ImageSelection>(() =>
    movie?.posterUrl ? { source: 'existing', url: movie.posterUrl } : { source: 'none' },
  );
  const [banner, setBanner] = useState<ImageSelection>(() =>
    movie?.bannerUrl ? { source: 'existing', url: movie.bannerUrl } : { source: 'none' },
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const changedImageCount = [poster, banner].filter(
      (selection) => selection.source === 'local' || selection.source === 'remote',
    ).length;
    let completedImages = 0;
    const resolveWithProgress = async (selection: ImageSelection, kind: MediaKind) => {
      try {
        return await resolveImage(selection, kind);
      } finally {
        if (selection.source === 'local' || selection.source === 'remote') {
          completedImages += 1;
          setUploadProgress(Math.round((completedImages / changedImageCount) * 100));
        }
      }
    };
    setUploadProgress(changedImageCount === 0 ? 100 : 0);
    setProcessingStage('uploading');
    const imageResults = await Promise.allSettled([
      resolveWithProgress(poster, 'poster'),
      resolveWithProgress(banner, 'banner'),
    ]);
    const stagedAssets = imageResults.flatMap((result) =>
      result.status === 'fulfilled' && result.value.asset ? [result.value.asset] : [],
    );
    const failedImage = imageResults.find((result) => result.status === 'rejected');
    if (failedImage?.status === 'rejected') {
      await cleanupStagedAssets(stagedAssets);
      setError(
        failedImage.reason instanceof Error
          ? failedImage.reason.message
          : 'The movie images could not be uploaded.',
      );
      setProcessingStage('idle');
      return;
    }
    const posterResult = imageResults[0].status === 'fulfilled' ? imageResults[0].value : null;
    const bannerResult = imageResults[1].status === 'fulfilled' ? imageResults[1].value : null;
    if (!posterResult?.url) {
      await cleanupStagedAssets(stagedAssets);
      setError('Choose a poster image.');
      setProcessingStage('idle');
      return;
    }

    try {
      setProcessingStage('saving');
      const input: MovieInput = {
        contentType: String(data.get('contentType')) as MovieInput['contentType'],
        title: String(data.get('title')).trim(),
        description: String(data.get('description')).trim(),
        posterUrl: posterResult.url,
        bannerUrl: bannerResult?.url ?? null,
        genres: String(data.get('genres'))
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        languages: String(data.get('languages'))
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        durationMin: Number(data.get('durationMin')),
        certificate: String(data.get('certificate')).trim(),
        rating: Number(data.get('rating')),
        releaseDate: String(data.get('releaseDate')),
        status: String(data.get('status')) as MovieInput['status'],
      };
      if (posterResult.asset) input.posterAssetKey = posterResult.asset.key;
      if (bannerResult?.asset) input.bannerAssetKey = bannerResult.asset.key;
      else if (!bannerResult?.url) input.bannerAssetKey = null;
      await onSubmit(input);
      setProcessingStage('idle');
    } catch (caughtError) {
      await cleanupStagedAssets(stagedAssets);
      setError(caughtError instanceof Error ? caughtError.message : 'Could not save the movie.');
      setProcessingStage('idle');
    }
  };

  const busy = loading || processingStage !== 'idle';

  return (
    <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
      <Select defaultValue={movie?.contentType ?? 'movie'} label="Content type" name="contentType">
        <option value="movie">Movie</option>
        <option value="event">Event</option>
      </Select>
      <Input defaultValue={movie?.title} label="Title" name="title" required />
      <div className="grid gap-4 lg:grid-cols-2">
        <ImagePickerField
          kind="poster"
          label="Poster image"
          onChange={setPoster}
          required
          value={poster}
        />
        <ImagePickerField kind="banner" label="Banner image" onChange={setBanner} value={banner} />
      </div>
      <Textarea
        defaultValue={movie?.description}
        label="Description"
        minLength={20}
        name="description"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          defaultValue={movie?.genres.join(', ')}
          hint="Comma-separated"
          label="Genres"
          name="genres"
          required
        />
        <Input
          defaultValue={movie?.languages.join(', ')}
          hint="Comma-separated"
          label="Languages"
          name="languages"
          required
        />
        <Input
          defaultValue={movie?.durationMin ?? 120}
          label="Duration (minutes)"
          max={600}
          min={1}
          name="durationMin"
          required
          type="number"
        />
        <Input
          defaultValue={movie?.certificate ?? 'U/A'}
          label="Certificate"
          name="certificate"
          required
        />
        <Input
          defaultValue={movie?.rating ?? 8}
          label="Rating / 10"
          max={10}
          min={0}
          name="rating"
          required
          step="0.1"
          type="number"
        />
        <Input
          defaultValue={movie?.releaseDate}
          label="Release date"
          name="releaseDate"
          required
          type="date"
        />
        <Select defaultValue={movie?.status ?? 'draft'} label="Status" name="status">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </div>
      {error ? (
        <p className="rounded bg-brand-soft p-3 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      {processingStage === 'uploading' ? (
        <div aria-live="polite" className="grid gap-2">
          <div className="flex justify-between text-sm text-muted">
            <span>Preparing movie images…</span>
            <span>{uploadProgress}%</span>
          </div>
          <progress
            aria-label="Image upload progress"
            className="h-2 w-full accent-brand"
            max={100}
            value={uploadProgress}
          />
        </div>
      ) : null}
      <div className="flex justify-end gap-3">
        <Button disabled={busy} onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={busy} type="submit">
          {processingStage === 'uploading'
            ? 'Uploading images…'
            : processingStage === 'saving' || loading
              ? 'Saving…'
              : 'Save movie'}
        </Button>
      </div>
    </form>
  );
}
