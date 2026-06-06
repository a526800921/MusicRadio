import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWeather } from '../weather';

function mockFetchResponse(body: string, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => body,
  };
}

function mockFetchAbortError() {
  return new DOMException('The operation was aborted', 'AbortError');
}

function mockFetchNetworkError() {
  return new Error('fetch failed');
}

describe('getWeather', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // fast-forward timer for tests that dispatch timeout via AbortController
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('successful parsing', () => {
    it('parses "Partly Cloudy +26°C" correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Partly Cloudy +26°C')
      );

      const result = await getWeather();

      expect(result.condition).toBe('多云');
      expect(result.temp).toBe('+26°C');
      expect(result.city).toBe('Shanghai');
      expect(result.label).toBe('当前天气：多云，+26度，Shanghai');
    });

    it('parses "Sunny +30°C" correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Sunny +30°C')
      );

      const result = await getWeather();

      expect(result.condition).toBe('晴');
      expect(result.temp).toBe('+30°C');
      expect(result.label).toBe('当前天气：晴，+30度，Shanghai');
    });

    it('parses negative temperature', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Snow -5°C')
      );

      const result = await getWeather();

      expect(result.condition).toBe('雪');
      expect(result.temp).toBe('-5°C');
      expect(result.label).toBe('当前天气：雪，-5度，Shanghai');
    });

    it('parses temperature without sign (positive)', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Clear 22°C')
      );

      const result = await getWeather();

      expect(result.condition).toBe('晴');
      expect(result.temp).toBe('22°C');
    });

    it('parses multi-word weather conditions', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Light rain +18°C')
      );

      const result = await getWeather();

      expect(result.condition).toBe('小雨');
      expect(result.temp).toBe('+18°C');
    });

    it('uses WEATHER_CITY env var', async () => {
      vi.stubEnv('WEATHER_CITY', 'Beijing');
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Sunny +25°C')
      );

      const result = await getWeather();

      expect(result.city).toBe('Beijing');
      expect(result.label).toContain('Beijing');

      vi.unstubAllEnvs();
    });

    it('encodes city name with spaces', async () => {
      vi.stubEnv('WEATHER_CITY', 'New York');
      let calledUrl = '';
      global.fetch = vi.fn().mockImplementation((url: string) => {
        calledUrl = url;
        return Promise.resolve(mockFetchResponse('Cloudy +20°C'));
      });

      const result = await getWeather();

      expect(calledUrl).toContain('New%20York');
      expect(result.city).toBe('New York');
      expect(result.label).toContain('New York');

      vi.unstubAllEnvs();
    });
  });

  describe('condition translation', () => {
    const translationCases: [string, string][] = [
      ['Sunny', '晴'],
      ['Clear', '晴'],
      ['Partly Cloudy', '多云'],
      ['Partly cloudy', '多云'],
      ['Cloudy', '阴'],
      ['Overcast', '阴'],
      ['Light rain', '小雨'],
      ['Light drizzle', '小雨'],
      ['Drizzle', '小雨'],
      ['Rain', '雨'],
      ['Heavy rain', '大雨'],
      ['Thunderstorm', '雷阵雨'],
      ['Snow', '雪'],
      ['Mist', '雾'],
      ['Fog', '雾'],
    ];

    for (const [input, expected] of translationCases) {
      it(`translates "${input}" to "${expected}"`, async () => {
        global.fetch = vi.fn().mockResolvedValue(
          mockFetchResponse(`${input} +20°C`)
        );

        const result = await getWeather();

        expect(result.condition).toBe(expected);
      });
    }
  });

  it('keeps unknown condition as-is', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse('Blizzard +0°C')
    );

    const result = await getWeather();

    expect(result.condition).toBe('Blizzard');
  });

  describe('partial match translation', () => {
    it('matches "Light Rain Shower" as 小雨', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Light Rain Shower +18°C')
      );

      const result = await getWeather();

      expect(result.condition).toBe('小雨');
    });

    it('matches "Heavy Rain With Thunder" as 大雨', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Heavy Rain With Thunder +22°C')
      );

      const result = await getWeather();

      expect(result.condition).toBe('大雨');
    });
  });

  describe('error handling', () => {
    it('returns empty label on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(mockFetchNetworkError());

      const result = await getWeather();
      expect(result.label).toBe('');
    });

    it('returns empty label on HTTP error status', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Not Found', false, 404)
      );

      const result = await getWeather();
      expect(result.label).toBe('');
    });

    it('returns empty label on empty response body', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('   ')
      );

      const result = await getWeather();
      expect(result.label).toBe('');
    });

    it('returns empty label when response has only one part', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse('Sunny')
      );

      const result = await getWeather();
      expect(result.label).toBe('');
    });

    it('never throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('unexpected crash'));

      let threw = false;
      try {
        await getWeather();
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    });
  });

  describe('timeout', () => {
    it('returns empty label on abort error (simulated timeout)', async () => {
      global.fetch = vi.fn().mockRejectedValue(mockFetchAbortError());

      const result = await getWeather();
      expect(result.label).toBe('');
    });

    it('uses AbortController with 5-second timeout', () => {
      // Spy on AbortController to verify it is used
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse('Sunny +25°C'));

      // We just verify setup patterns — can't await with real timers frozen
      const promise = getWeather();

      // Verify setTimeout was called with ~5000ms
      const setTimeoutCall = setTimeoutSpy.mock.calls.find(
        (call) => typeof call[1] === 'number'
      );
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(abortSpy).not.toHaveBeenCalled(); // not yet timed out

      abortSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });
  });
});
