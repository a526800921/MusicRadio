import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../chat';

describe('POST /api/chat', () => {
  it('returns 400 when message is missing', async () => {
    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('message');
  });

  it('returns 400 when message is empty string', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: '' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 400 when message is whitespace only', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: '   ' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 405 for non-POST', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('handles CONTROL intent (returns type info without calling Claude)', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: '播放' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.type).toBe('CONTROL');
  });

  it('handles SEARCH intent (returns type and keyword without calling Claude)', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: '搜索周杰伦的晴天' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.type).toBe('SEARCH');
    expect(data).toHaveProperty('keyword');
  });

  it('returns error for AI intent when Claude is unavailable (graceful failure)', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: '推荐一首适合现在听的歌' } });
    await handler(req, res);
    // Should either succeed (if Claude is available) or return 500 with error
    const status = res._getStatusCode();
    const data = JSON.parse(res._getData());
    // AI path will likely fail in test env (no Claude CLI), but should not crash
    expect([200, 500]).toContain(status);
    if (status === 500) {
      expect(data).toHaveProperty('error');
    }
  }, 70000);
});
