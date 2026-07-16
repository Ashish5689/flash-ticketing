import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/redis.js', () => ({
  redis: { get: vi.fn().mockResolvedValue(null) },
}));

import { env } from '../src/config/env.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/error.js';
import { requireTrustedOrigin } from '../src/middleware/trusted-origin.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/modules/auth/token.service.js';

const testUser = {
  id: 'b3e6c021-6625-4e4e-9e77-6993766d9125',
  email: 'user@example.com',
  role: 'USER' as const,
};

describe('application JWTs', () => {
  it('signs and verifies access claims', async () => {
    const claims = await verifyAccessToken(await signAccessToken(testUser));
    expect(claims).toMatchObject({
      sub: testUser.id,
      email: testUser.email,
      role: 'USER',
      type: 'access',
    });
  });

  it('uses a separate refresh token shape', async () => {
    const { token, jti } = await signRefreshToken(testUser.id);
    const claims = await verifyRefreshToken(token);
    expect(claims).toMatchObject({ sub: testUser.id, jti, type: 'refresh' });
    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});

describe('auth middleware', () => {
  it('accepts a valid bearer token and enforces roles', async () => {
    const app = express();
    app.get('/admin', requireAuth, requireRole('ADMIN'), (_request, response) =>
      response.sendStatus(204),
    );
    app.use(errorHandler);

    const token = await signAccessToken(testUser);
    await request(app).get('/admin').set('authorization', `Bearer ${token}`).expect(403);

    const adminToken = await signAccessToken({ ...testUser, role: 'ADMIN' });
    await request(app).get('/admin').set('authorization', `Bearer ${adminToken}`).expect(204);
  });

  it('rejects missing bearer credentials', async () => {
    const app = express();
    app.get('/private', requireAuth, (_request, response) => response.sendStatus(204));
    app.use(errorHandler);
    const response = await request(app).get('/private').expect(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });
});

describe('trusted origin middleware', () => {
  it('allows the configured frontend and rejects other origins', async () => {
    const app = express();
    app.post('/cookie', requireTrustedOrigin, (_request, response) => response.sendStatus(204));
    app.use(errorHandler);

    await request(app).post('/cookie').set('origin', env.CORS_ORIGIN).expect(204);
    await request(app).post('/cookie').set('origin', 'https://example.com').expect(403);
  });
});
