import { lazy, Suspense, useEffect, useState, type ChangeEvent } from 'react';

import type { MediaKind } from '../../types/catalog';
import { Button, Input, Spinner } from '../ui';

const ImageCropEditor = lazy(() => import('./ImageCropEditor'));

export type ImageSelection =
  | { source: 'existing'; url: string }
  | { source: 'local'; url: string; blob: Blob }
  | { source: 'remote'; url: string }
  | { source: 'none' };

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 10 * 1024 * 1024;

export function ImagePickerField({
  kind,
  label,
  required,
  value,
  onChange,
}: {
  kind: MediaKind;
  label: string;
  required?: boolean;
  value: ImageSelection;
  onChange: (value: ImageSelection) => void;
}) {
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewUrl = value.source === 'none' ? null : value.url;

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewUrl]);

  useEffect(
    () => () => {
      if (cropSource) URL.revokeObjectURL(cropSource);
    },
    [cropSource],
  );

  useEffect(
    () => () => {
      if (value.source === 'local') URL.revokeObjectURL(value.url);
    },
    [value],
  );

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (!acceptedTypes.has(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > maxBytes) {
      setError('Images must be 10 MB or smaller.');
      return;
    }
    setCropSource(URL.createObjectURL(file));
    setUrlOpen(false);
  };

  const useRemoteUrl = () => {
    setError(null);
    try {
      const parsed = new URL(remoteUrl.trim());
      if (parsed.protocol !== 'https:') throw new Error();
      onChange({ source: 'remote', url: parsed.toString() });
      setUrlOpen(false);
    } catch {
      setError('Paste a direct HTTPS image address.');
    }
  };

  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-semibold">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </legend>
      {cropSource ? (
        <Suspense
          fallback={
            <div className="grid min-h-80 place-items-center">
              <Spinner label="Loading image cropper" />
            </div>
          }
        >
          <ImageCropEditor
            kind={kind}
            onApply={(blob) => {
              onChange({ source: 'local', url: URL.createObjectURL(blob), blob });
              setCropSource(null);
            }}
            onCancel={() => setCropSource(null)}
            sourceUrl={cropSource}
          />
        </Suspense>
      ) : (
        <>
          <div
            className={
              kind === 'poster'
                ? 'mx-auto grid aspect-[2/3] max-h-72 max-w-48 place-items-center overflow-hidden rounded-lg bg-surface-subtle'
                : 'grid aspect-video max-h-64 w-full place-items-center overflow-hidden rounded-lg bg-surface-subtle'
            }
          >
            {previewUrl && !previewFailed ? (
              <img
                alt={`${label} preview`}
                className="size-full object-cover"
                onError={() => setPreviewFailed(true)}
                src={previewUrl}
              />
            ) : (
              <p className="px-4 text-center text-sm text-muted">
                {previewFailed ? 'This image cannot be previewed.' : `No ${kind} selected`}
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded border border-brand bg-surface px-5 text-sm font-semibold text-brand transition duration-fast hover:bg-brand-soft">
              Upload from device
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={chooseFile}
                type="file"
              />
            </label>
            <Button onClick={() => setUrlOpen((open) => !open)} variant="outline">
              Import from URL
            </Button>
            {!required && value.source !== 'none' ? (
              <Button onClick={() => onChange({ source: 'none' })} variant="ghost">
                Remove
              </Button>
            ) : null}
          </div>
          {urlOpen ? (
            <div className="mt-4 rounded bg-surface-subtle p-4">
              <Input
                hint="Paste the direct image address, not a Google Images results page."
                label="Direct HTTPS image URL"
                onChange={(event) => setRemoteUrl(event.target.value)}
                placeholder="https://example.com/movie-poster.jpg"
                type="url"
                value={remoteUrl}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button onClick={() => setUrlOpen(false)} size="sm" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={!remoteUrl.trim()} onClick={useRemoteUrl} size="sm">
                  Use URL
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p className="mt-3 rounded bg-brand-soft p-3 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        JPEG, PNG, or WebP up to 10 MB.{' '}
        {kind === 'poster' ? 'Local files crop to 800×1200.' : 'Local files crop to 1600×900.'}
      </p>
    </fieldset>
  );
}
