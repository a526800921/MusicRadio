import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import fs from 'fs';
import path from 'path';
import handler from '../[hash]';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'tts');
const TEST_HASH = 'test-api-tts-endpoint';
const TEST_FILE = path.join(CACHE_DIR, `${TEST_HASH}.wav`);

describe('GET /api/tts/[hash]', () => {
  // Ensure cache dir and clean test file
  beforeAll(() => {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  });

  beforeEach(() => {
    try { if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE); } catch {}
  });

  afterAll(() => {
    try { if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE); } catch {}
  });

  it('returns 400 when hash is missing', async () => {
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 400 when hash is empty string', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { hash: '' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 404 when hash not found in cache', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { hash: 'nonexistent-hash' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns existing WAV file with correct headers', async () => {
    fs.writeFileSync(TEST_FILE, Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]));

    const { req, res } = createMocks({ method: 'GET', query: { hash: TEST_HASH } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('content-type')).toBe('audio/wav');
    expect(res.getHeader('content-length')).toBe(8);
    expect(res.getHeader('cache-control')).toContain('immutable');
  });
});
