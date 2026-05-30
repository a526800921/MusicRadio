import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../now';

describe('GET /api/now', () => {
  it('returns 200 with now-playing data structure', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('current');
    expect(data).toHaveProperty('history');
    expect(Array.isArray(data.history)).toBe(true);
  });

  it('returns null current when no plays exist', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    const data = JSON.parse(res._getData());
    expect(data.current).toBeNull();
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
