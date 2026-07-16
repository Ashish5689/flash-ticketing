import type { Area } from 'react-easy-crop';
import type { MediaKind } from '../types/catalog';

const dimensions: Record<MediaKind, { width: number; height: number }> = {
  poster: { width: 800, height: 1200 },
  banner: { width: 1600, height: 900 },
};

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be opened.'));
    image.src = sourceUrl;
  });
}

export async function createCroppedImageBlob(
  sourceUrl: string,
  croppedArea: Area,
  kind: MediaKind,
) {
  const image = await loadImage(sourceUrl);
  const output = dimensions[kind];
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image cropping is not supported by this browser.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    output.width,
    output.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The cropped image could not be created.'));
      },
      'image/webp',
      0.9,
    );
  });
}
