import { useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

import { createCroppedImageBlob } from '../../lib/crop-image';
import type { MediaKind } from '../../types/catalog';
import { Button } from '../ui';

const initialCrop: Point = { x: 0, y: 0 };

export default function ImageCropEditor({
  kind,
  sourceUrl,
  onApply,
  onCancel,
}: {
  kind: MediaKind;
  sourceUrl: string;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<Point>(initialCrop);
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = kind === 'poster' ? '2:3 poster' : '16:9 banner';

  const apply = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    setError(null);
    try {
      onApply(await createCroppedImageBlob(sourceUrl, croppedArea, kind));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The crop could not be used.');
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">Crop {label}</h4>
          <p className="mt-1 text-xs text-muted">Drag the image and use zoom to frame it.</p>
        </div>
        <Button
          onClick={() => {
            setCrop(initialCrop);
            setZoom(1);
          }}
          size="sm"
          variant="ghost"
        >
          Reset
        </Button>
      </div>
      <div className="relative mt-4 h-80 overflow-hidden rounded-lg bg-surface-dark">
        <Cropper
          aspect={kind === 'poster' ? 2 / 3 : 16 / 9}
          crop={crop}
          image={sourceUrl}
          onCropChange={setCrop}
          onCropComplete={(_area, areaPixels) => setCroppedArea(areaPixels)}
          onZoomChange={setZoom}
          showGrid
          zoom={zoom}
        />
      </div>
      <label className="mt-4 grid gap-2 text-sm font-medium" htmlFor={`${kind}-crop-zoom`}>
        Zoom
        <input
          className="accent-brand"
          id={`${kind}-crop-zoom`}
          max="3"
          min="1"
          onChange={(event) => setZoom(Number(event.target.value))}
          step="0.05"
          type="range"
          value={zoom}
        />
      </label>
      {error ? (
        <p className="mt-3 rounded bg-brand-soft p-3 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-3">
        <Button disabled={processing} onClick={onCancel} variant="outline">
          Cancel crop
        </Button>
        <Button disabled={processing || !croppedArea} onClick={() => void apply()}>
          {processing ? 'Preparing…' : 'Use crop'}
        </Button>
      </div>
    </div>
  );
}
