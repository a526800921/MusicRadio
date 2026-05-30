import { EdgeTTS } from 'edge-tts';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'tts');

function textHash(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export async function generateTTS(text: string): Promise<string> {
  const hash = textHash(text);
  const mp3File = path.join(CACHE_DIR, `${hash}.mp3`);

  // Return cached file if exists
  if (fs.existsSync(mp3File)) {
    return `/api/tts/${hash}`;
  }

  // Generate TTS audio
  ensureCacheDir();
  const tts = new EdgeTTS();
  await tts.ttsPromise(text, mp3File);

  return `/api/tts/${hash}`;
}

export function getTTSFilePath(hash: string): string | null {
  const mp3File = path.join(CACHE_DIR, `${hash}.mp3`);
  if (fs.existsSync(mp3File)) return mp3File;
  return null;
}
