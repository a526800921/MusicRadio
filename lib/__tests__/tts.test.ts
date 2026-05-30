import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { generateTTS, getTTSFilePath } from '../tts';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'tts');

function textHash(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

describe('generateTTS', () => {
  const testText = '测试语音合成';
  const hash = textHash(testText);
  const testFile = path.join(CACHE_DIR, `${hash}.wav`);

  beforeEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it('generates TTS audio and returns URL path', async () => {
    const url = await generateTTS(testText);
    expect(url).toBe(`/api/tts/${hash}`);
    expect(fs.existsSync(testFile)).toBe(true);
  }, 30000);

  it('returns cached URL when file already exists', async () => {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(testFile, Buffer.from([0x52, 0x49, 0x46, 0x46]));

    const url = await generateTTS(testText);
    expect(url).toBe(`/api/tts/${hash}`);
    expect(fs.statSync(testFile).size).toBe(4); // still dummy, not regenerated
  });

  it('same text produces same hash every time', async () => {
    const url1 = await generateTTS('稳定的哈希测试文本');
    const url2 = await generateTTS('稳定的哈希测试文本');
    expect(url1).toBe(url2);
  }, 30000);

  it('different texts produce different URLs', async () => {
    const url1 = await generateTTS('文本A');
    const url2 = await generateTTS('文本B');
    expect(url1).not.toBe(url2);
  }, 30000);

  it('handles text with special characters', async () => {
    const url = await generateTTS('你好 — "世界" (2024) $100 のテスト');
    expect(url).toMatch(/^\/api\/tts\//);
    const h = url.split('/').pop()!;
    expect(fs.existsSync(path.join(CACHE_DIR, `${h}.wav`))).toBe(true);
  }, 30000);

  it('handles mixed Chinese and English', async () => {
    const url = await generateTTS('这首歌叫做 Hello World by Coldplay 非常好听');
    expect(url).toMatch(/^\/api\/tts\//);
  }, 30000);

  it('handles very short text', async () => {
    const url = await generateTTS('好');
    expect(url).toMatch(/^\/api\/tts\//);
  }, 30000);

  it('handles long text with newlines', async () => {
    const long = '第一段话。\n第二段话：深夜了，来一首安静的歌。\n第三段——转场。';
    const url = await generateTTS(long);
    expect(url).toMatch(/^\/api\/tts\//);
  }, 30000);
});

describe('getTTSFilePath', () => {
  const testHash = 'test-hash-123';
  const testFile = path.join(CACHE_DIR, `${testHash}.wav`);

  beforeEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it('returns file path when cached file exists', () => {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(testFile, Buffer.from([0x52, 0x49, 0x46, 0x46]));

    const result = getTTSFilePath(testHash);
    expect(result).toBe(testFile);
  });

  it('returns null when cached file does not exist', () => {
    const result = getTTSFilePath('non-existent-hash');
    expect(result).toBeNull();
  });
});
