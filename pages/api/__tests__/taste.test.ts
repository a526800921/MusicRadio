import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../taste';

describe('GET /api/taste', () => {
  it('returns taste data', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('taste');
    expect(typeof data.taste).toBe('string');
  });

  it('returns 405 for non-GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
