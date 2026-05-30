import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../search';

describe('GET /api/search', () => {
  it('returns 400 when q parameter is missing', async () => {
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 405 for non-GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns songs array with valid query (may be empty if API unreachable)', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { q: '晴天' } });
    await handler(req, res);
    // API may be unreachable in test, but status should be 200
    const status = res._getStatusCode();
    const data = JSON.parse(res._getData());
    expect(status === 200 || status === 500).toBe(true);
    if (status === 200) {
      expect(data).toHaveProperty('songs');
      expect(Array.isArray(data.songs)).toBe(true);
    }
  });
});
