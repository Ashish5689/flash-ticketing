import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns service health and a request id', async () => {
    const response = await request(createApp()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'book-my-show-api',
    });
    expect(response.body.requestId).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });
});
