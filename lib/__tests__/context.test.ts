import { describe, it, expect } from 'vitest';
import { assembleContext } from '../context';

describe('assembleContext', () => {
  it('returns persona from prompt/persona.md', () => {
    const ctx = assembleContext();
    expect(ctx.persona).toContain('Claudio');
  });

  it('includes time context from scheduler', () => {
    const ctx = assembleContext();
    expect(ctx.timeContext).toMatch(/^当前时段：(早上|下午|晚上|深夜)$/);
  });

  it('includes user taste data', () => {
    const ctx = assembleContext();
    expect(ctx.userContext.length).toBeGreaterThan(0);
    expect(ctx.userContext).toContain('音乐品味');
  });

  it('includes play history', () => {
    const ctx = assembleContext();
    expect(typeof ctx.recentHistory).toBe('string');
  });

  it('returns all four required fields', () => {
    const ctx = assembleContext();
    expect(ctx).toHaveProperty('persona');
    expect(ctx).toHaveProperty('userContext');
    expect(ctx).toHaveProperty('timeContext');
    expect(ctx).toHaveProperty('recentHistory');
  });

  it('returns non-empty persona string', () => {
    const ctx = assembleContext();
    expect(ctx.persona.length).toBeGreaterThan(0);
  });

  it('handles missing play history gracefully', () => {
    const ctx = assembleContext();
    // Either "暂无播放历史" or actual history string
    expect(typeof ctx.recentHistory).toBe('string');
    expect(ctx.recentHistory.length).toBeGreaterThan(0);
  });
});
