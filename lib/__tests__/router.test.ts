import { describe, it, expect } from 'vitest';
import { routeIntent } from '../router';

describe('routeIntent', () => {
  describe('CONTROL type', () => {
    it('routes 播放 as CONTROL', () => {
      expect(routeIntent('播放').type).toBe('CONTROL');
    });
    it('routes 暂停 as CONTROL', () => {
      expect(routeIntent('暂停').type).toBe('CONTROL');
    });
    it('routes 下一首 as CONTROL', () => {
      expect(routeIntent('下一首').type).toBe('CONTROL');
    });
    it('routes 上一首 as CONTROL', () => {
      expect(routeIntent('上一首').type).toBe('CONTROL');
    });
    it('routes 音量调大 as CONTROL', () => {
      expect(routeIntent('音量调大').type).toBe('CONTROL');
    });
    it('routes 停止 as CONTROL', () => {
      expect(routeIntent('停止').type).toBe('CONTROL');
    });
    it('routes 继续 as CONTROL', () => {
      expect(routeIntent('继续').type).toBe('CONTROL');
    });
  });

  describe('SEARCH type', () => {
    it('routes 搜索 as SEARCH', () => {
      const r = routeIntent('搜索周杰伦的晴天');
      expect(r.type).toBe('SEARCH');
      expect(r.keyword).toBe('周杰伦 晴天');
    });
    it('routes 搜 as SEARCH', () => {
      const r = routeIntent('搜一下稻香');
      expect(r.type).toBe('SEARCH');
      expect(r.keyword).toBe('稻香');
    });
    it('routes 找 as SEARCH', () => {
      const r = routeIntent('找陈奕迅的歌');
      expect(r.type).toBe('SEARCH');
      expect(r.keyword).toBe('陈奕迅');
    });
    it('routes 帮我搜 as SEARCH', () => {
      const r = routeIntent('帮我搜七里香');
      expect(r.type).toBe('SEARCH');
      expect(r.keyword).toBe('七里香');
    });
  });

  describe('AI type', () => {
    it('routes natural language recommendation as AI', () => {
      expect(routeIntent('推荐一首适合现在听的歌').type).toBe('AI');
    });
    it('routes mood-based request as AI', () => {
      expect(routeIntent('今天心情不好，想听点开心的歌').type).toBe('AI');
    });
    it('routes general question as AI', () => {
      expect(routeIntent('最近有什么好听的').type).toBe('AI');
    });
    it('routes 随便放一首 as AI', () => {
      expect(routeIntent('随便放一首').type).toBe('AI');
    });
    it('routes 换一首类似风格的 as AI', () => {
      expect(routeIntent('换一首类似风格的').type).toBe('AI');
    });
  });
});
