import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { importImageSchema } from '../src/modules/media/media.schemas.js';
import { isPublicIpAddress, normalizeImage } from '../src/modules/media/media.service.js';

describe('media URL security', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '::1',
    'fc00::1',
    'fe80::1',
  ])('rejects private or reserved address %s', (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('allows public address %s', (address) => {
    expect(isPublicIpAddress(address)).toBe(true);
  });

  it('requires a direct HTTPS URL', () => {
    expect(() =>
      importImageSchema.parse({ sourceUrl: 'http://example.com/a.jpg', kind: 'poster' }),
    ).toThrow();
    expect(
      importImageSchema.parse({ sourceUrl: 'https://example.com/a.jpg', kind: 'poster' }),
    ).toEqual({ sourceUrl: 'https://example.com/a.jpg', kind: 'poster' });
  });
});

describe('media normalization', () => {
  it('creates an exact 2:3 WebP poster from a local crop', async () => {
    const source = await sharp({
      create: { width: 400, height: 400, channels: 3, background: '#ef476f' },
    })
      .png()
      .toBuffer();
    const result = await normalizeImage(source, 'poster', true);
    const metadata = await sharp(result.buffer).metadata();
    expect({ width: result.width, height: result.height, format: metadata.format }).toEqual({
      width: 800,
      height: 1200,
      format: 'webp',
    });
  });

  it('preserves remote-image framing without enlarging it', async () => {
    const source = await sharp({
      create: { width: 640, height: 360, channels: 3, background: '#1e2635' },
    })
      .jpeg()
      .toBuffer();
    const result = await normalizeImage(source, 'banner', false);
    expect({ width: result.width, height: result.height }).toEqual({ width: 640, height: 360 });
  });

  it('rejects SVG input', async () => {
    await expect(
      normalizeImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
        ),
        'poster',
        true,
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_IMAGE_TYPE', statusCode: 415 });
  });
});
