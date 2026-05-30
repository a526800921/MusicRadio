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
    // Pre-create a dummy WAV
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(testFile, Buffer.from([0x52, 0x49, 0x46, 0x46]));

    const url = await generateTTS(testText);
    expect(url).toBe(`/api/tts/${hash}`);
    // Should still be the dummy file (not re-generated)
    expect(fs.statSync(testFile).size).toBe(4);
  });
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
