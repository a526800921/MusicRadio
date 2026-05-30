import { describe, it, expect } from 'vitest';
import { formatSearchResult } from '../netease';

describe('formatSearchResult', () => {
  it('formats raw search result into simplified structure', () => {
    const raw = {
      result: {
        songs: [
          { id: 123, name: '晴天', ar: [{ name: '周杰伦' }], al: { name: '叶惠美' }, dt: 269000 },
          { id: 456, name: '七里香', ar: [{ name: '周杰伦' }], al: { name: '七里香' }, dt: 299000 },
        ],
      },
    };
    const result = formatSearchResult(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: '123', name: '晴天', artist: '周杰伦', album: '叶惠美' });
    expect(result[1]).toEqual({ id: '456', name: '七里香', artist: '周杰伦', album: '七里香' });
  });

  it('handles multiple artists joined with /', () => {
    const raw = {
      result: {
        songs: [
          { id: 789, name: '合作曲', ar: [{ name: '艺人A' }, { name: '艺人B' }], al: { name: '专辑' } },
        ],
      },
    };
    const result = formatSearchResult(raw);
    expect(result[0].artist).toBe('艺人A/艺人B');
  });

  it('returns empty array for empty song list', () => {
    expect(formatSearchResult({ result: { songs: [] } })).toEqual([]);
  });

  it('returns empty array for missing result', () => {
    expect(formatSearchResult({})).toEqual([]);
  });

  it('handles missing album info', () => {
    const raw = {
      result: {
        songs: [{ id: 1, name: 'Song', ar: [{ name: 'Artist' }] }],
      },
    };
    const result = formatSearchResult(raw);
    expect(result[0].album).toBe('');
  });
});
