import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWeather } from '@/lib/weather';

vi.mock("@/lib/weather", () => ({ getWeather: vi.fn() }));

import { assembleContext } from '../context';

const mockGetWeather = vi.mocked(getWeather);

describe('assembleContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns persona from prompt/persona.md', async () => {
    const ctx = await assembleContext();
    expect(ctx.persona).toContain('Claudio');
  });

  it('includes time context from scheduler', async () => {
    const ctx = await assembleContext();
    expect(ctx.timeContext).toMatch(/^当前时段：(早上|下午|晚上|深夜)$/);
  });

  it('includes user taste data', async () => {
    const ctx = await assembleContext();
    expect(ctx.userContext.length).toBeGreaterThan(0);
    expect(ctx.userContext).toContain('音乐品味');
  });

  it('includes play history', async () => {
    const ctx = await assembleContext();
    expect(typeof ctx.recentHistory).toBe('string');
  });

  it('returns all five required fields', async () => {
    const ctx = await assembleContext();
    expect(ctx).toHaveProperty('persona');
    expect(ctx).toHaveProperty('userContext');
    expect(ctx).toHaveProperty('timeContext');
    expect(ctx).toHaveProperty('recentHistory');
    expect(ctx).toHaveProperty('weatherContext');
  });

  it('returns non-empty persona string', async () => {
    const ctx = await assembleContext();
    expect(ctx.persona.length).toBeGreaterThan(0);
  });

  it('handles missing play history gracefully', async () => {
    const ctx = await assembleContext();
    expect(typeof ctx.recentHistory).toBe('string');
    expect(ctx.recentHistory.length).toBeGreaterThan(0);
  });

  it('includes weatherContext from getWeather label', async () => {
    mockGetWeather.mockResolvedValue({
      condition: '多云',
      temp: '26°C',
      city: 'Shanghai',
      label: '当前天气：多云，26度，Shanghai',
    });

    const ctx = await assembleContext();
    expect(ctx.weatherContext).toBe('当前天气：多云，26度，Shanghai');
  });

  it('sets weatherContext to empty string when getWeather fails', async () => {
    mockGetWeather.mockRejectedValue(new Error('Network error'));

    const ctx = await assembleContext();
    expect(ctx.weatherContext).toBe('');
  });
});
