import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../history';

describe('GET /api/history', () => {
  it('returns play history array', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('plays');
    expect(Array.isArray(data.plays)).toBe(true);
  });

  it('returns 405 for non-GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
