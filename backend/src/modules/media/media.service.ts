import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { or, eq } from 'drizzle-orm';
import ipaddr from 'ipaddr.js';
import sharp, { type Metadata } from 'sharp';

import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { movies } from '../../db/schema/movies.js';
import { AppError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import type { z } from 'zod';
import type { mediaKindSchema } from './media.schemas.js';

export type MediaKind = z.infer<typeof mediaKindSchema>;
export type MediaAsset = {
  url: string;
  key: string;
  width: number;
  height: number;
  contentType: 'image/webp';
};

const maxInputBytes = 10 * 1024 * 1024;
const maxInputPixels = 25_000_000;
const allowedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedFormats = new Set(['jpeg', 'png', 'webp']);
const maxRedirects = 3;
const remoteTimeoutMs = 8_000;

let s3Client: S3Client | undefined;

function mediaConfig() {
  if (!env.AWS_S3_BUCKET || !env.MEDIA_PUBLIC_BASE_URL) {
    throw new AppError(
      503,
      'MEDIA_STORAGE_NOT_CONFIGURED',
      'Movie media storage has not been configured',
    );
  }
  return {
    bucket: env.AWS_S3_BUCKET,
    publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, ''),
  };
}

function client() {
  s3Client ??= new S3Client({ region: env.AWS_REGION });
  return s3Client;
}

export function mediaUrlForKey(key: string) {
  return `${mediaConfig().publicBaseUrl}/${key}`;
}

export function assertManagedAssetUrl(url: string, key: string | null, expectedKind: MediaKind) {
  if (!key) return;
  const expectedPrefix = expectedKind === 'poster' ? 'movies/posters/' : 'movies/banners/';
  if (!key.startsWith(expectedPrefix) || mediaUrlForKey(key) !== url) {
    throw new AppError(400, 'INVALID_MEDIA_ASSET', 'The media URL and asset key do not match');
  }
}

export function isPublicIpAddress(address: string) {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

async function assertPublicRemoteUrl(url: URL) {
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new AppError(400, 'INVALID_IMAGE_URL', 'Use a public HTTPS image URL');
  }
  if (url.port && url.port !== '443') {
    throw new AppError(400, 'INVALID_IMAGE_URL', 'Custom URL ports are not allowed');
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError(400, 'IMAGE_URL_UNREACHABLE', 'The image hostname could not be resolved');
  }
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new AppError(400, 'UNSAFE_IMAGE_URL', 'Private or reserved image hosts are not allowed');
  }
}

async function readLimitedBody(response: Response) {
  if (!response.body) {
    throw new AppError(400, 'IMAGE_DOWNLOAD_FAILED', 'The image response was empty');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxInputBytes) {
      await reader.cancel();
      throw new AppError(413, 'IMAGE_TOO_LARGE', 'Images must be 10 MB or smaller');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, total);
}

async function downloadRemoteImage(source: URL, redirects = 0): Promise<Buffer> {
  await assertPublicRemoteUrl(source);
  let response: Response;
  try {
    response = await fetch(source, {
      redirect: 'manual',
      signal: AbortSignal.timeout(remoteTimeoutMs),
      headers: {
        accept: 'image/jpeg,image/png,image/webp',
        'user-agent': 'MovieTicketingMediaImporter/1.0',
      },
    });
  } catch {
    throw new AppError(400, 'IMAGE_URL_UNREACHABLE', 'The remote image could not be downloaded');
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location || redirects >= maxRedirects) {
      await response.body?.cancel();
      throw new AppError(400, 'IMAGE_REDIRECT_REJECTED', 'The image URL redirected too many times');
    }
    await response.body?.cancel();
    return downloadRemoteImage(new URL(location, source), redirects + 1);
  }
  if (!response.ok) {
    throw new AppError(
      400,
      'IMAGE_DOWNLOAD_FAILED',
      `The image server returned HTTP ${response.status}`,
    );
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (!contentType || !allowedContentTypes.has(contentType)) {
    throw new AppError(415, 'UNSUPPORTED_IMAGE_TYPE', 'Use a JPEG, PNG, or WebP image');
  }
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > maxInputBytes) {
    throw new AppError(413, 'IMAGE_TOO_LARGE', 'Images must be 10 MB or smaller');
  }
  return readLimitedBody(response);
}

export async function normalizeImage(input: Buffer, kind: MediaKind, cropped: boolean) {
  const source = sharp(input, { failOn: 'error', limitInputPixels: maxInputPixels }).rotate();
  let metadata: Metadata;
  try {
    metadata = await source.metadata();
  } catch {
    throw new AppError(400, 'INVALID_IMAGE', 'The uploaded file is not a valid image');
  }
  if (!metadata.format || !allowedFormats.has(metadata.format)) {
    throw new AppError(415, 'UNSUPPORTED_IMAGE_TYPE', 'Use a JPEG, PNG, or WebP image');
  }

  const output = cropped
    ? source.resize(
        kind === 'poster'
          ? { width: 800, height: 1200, fit: 'cover' }
          : { width: 1600, height: 900, fit: 'cover' },
      )
    : source.resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });
  const result = await output.webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
  return { buffer: result.data, width: result.info.width, height: result.info.height };
}

async function storeImage(input: Buffer, kind: MediaKind, cropped: boolean): Promise<MediaAsset> {
  const normalized = await normalizeImage(input, kind, cropped);
  const folder = kind === 'poster' ? 'posters' : 'banners';
  const key = `movies/${folder}/${randomUUID()}.webp`;
  const { bucket } = mediaConfig();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: normalized.buffer,
      ContentType: 'image/webp',
      CacheControl: 'public,max-age=31536000,immutable',
    }),
  );
  return {
    key,
    url: mediaUrlForKey(key),
    width: normalized.width,
    height: normalized.height,
    contentType: 'image/webp',
  };
}

export function uploadCroppedImage(input: Buffer, kind: MediaKind) {
  return storeImage(input, kind, true);
}

export async function importRemoteImage(sourceUrl: string, kind: MediaKind) {
  return storeImage(await downloadRemoteImage(new URL(sourceUrl)), kind, false);
}

export async function isMediaAttached(key: string) {
  const [movie] = await db
    .select({ id: movies.id })
    .from(movies)
    .where(or(eq(movies.posterAssetKey, key), eq(movies.bannerAssetKey, key)))
    .limit(1);
  return Boolean(movie);
}

export async function deleteManagedAsset(key: string) {
  const { bucket } = mediaConfig();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteManagedAssetsBestEffort(keys: Array<string | null | undefined>) {
  const uniqueKeys = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  if (uniqueKeys.length === 0) return;
  const results = await Promise.allSettled(uniqueKeys.map((key) => deleteManagedAsset(key)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn({ err: result.reason, key: uniqueKeys[index] }, 'Could not delete managed media');
    }
  });
}
