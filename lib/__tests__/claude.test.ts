import { describe, it, expect } from 'vitest';
import { parseClaudeOutput, buildPrompt } from '../claude';

describe('parseClaudeOutput', () => {
  it('parses valid JSON embedded in text', () => {
    const raw = `Here's my recommendation:\n\n{"say":"来听听这首经典","play":{"song_id":"123","song_name":"晴天","artist":"周杰伦"},"reason":"适合下午的阳光","segue":"下一首同样精彩"}`;
    const result = parseClaudeOutput(raw);
    expect(result.say).toBe('来听听这首经典');
    expect(result.play.song_id).toBe('123');
    expect(result.play.song_name).toBe('晴天');
    expect(result.play.artist).toBe('周杰伦');
    expect(result.reason).toBe('适合下午的阳光');
    expect(result.segue).toBe('下一首同样精彩');
  });

  it('parses standalone JSON', () => {
    const raw = '{"say":"hello","play":{"song_id":"1","song_name":"Song","artist":"Artist"},"reason":"good","segue":"next"}';
    const result = parseClaudeOutput(raw);
    expect(result.say).toBe('hello');
    expect(result.play.song_id).toBe('1');
  });

  it('throws on text without JSON', () => {
    expect(() => parseClaudeOutput('no json here at all')).toThrow('无法解析 Claude 输出');
  });

  it('throws on malformed JSON', () => {
    expect(() => parseClaudeOutput('{"say": "hello"')).toThrow('无法解析 Claude 输出');
  });

  it('throws when required fields missing', () => {
    expect(() => parseClaudeOutput('{"say":"hello"}')).toThrow();
  });

  it('uses empty string defaults for reason and segue', () => {
    const raw = '{"say":"hi","play":{"song_id":"1","song_name":"S","artist":"A"}}';
    const result = parseClaudeOutput(raw);
    expect(result.reason).toBe('');
    expect(result.segue).toBe('');
  });
});

describe('buildPrompt', () => {
  it('combines all input sections into a single prompt string', () => {
    const prompt = buildPrompt({
      persona: 'You are a DJ.',
      userContext: '喜欢摇滚',
      timeContext: '当前时段：晚上',
      recentHistory: '最近播放：晴天',
      userInput: '推荐一首歌',
    });
    expect(prompt).toContain('You are a DJ.');
    expect(prompt).toContain('喜欢摇滚');
    expect(prompt).toContain('当前时段：晚上');
    expect(prompt).toContain('最近播放：晴天');
    expect(prompt).toContain('推荐一首歌');
  });

  it('separates sections with newlines', () => {
    const prompt = buildPrompt({
      persona: 'P',
      userContext: 'U',
      timeContext: 'T',
      recentHistory: 'R',
      userInput: 'I',
    });
    const lines = prompt.split('\n');
    expect(lines.length).toBeGreaterThan(5);
  });
});
