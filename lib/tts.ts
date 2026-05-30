import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import https from 'https';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'tts');
const VOICE = 'zh-CN-XiaoxiaoNeural'; // Natural Chinese female voice
const TTS_URL = 'speech.platform.bing.com';

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

  if (fs.existsSync(mp3File)) {
    return `/api/tts/${hash}`;
  }

  ensureCacheDir();

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="${VOICE}">
      <mstts:express-as style="chat" styledegree="1.5">
        <prosody rate="+10%" pitch="+0%">${text}</prosody>
      </mstts:express-as>
    </voice>
  </speak>`;

  await downloadTTS(ssml, mp3File);
  return `/api/tts/${hash}`;
}

function downloadTTS(ssml: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TTS_URL,
      path: '/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Edge TTS returned ${res.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        fs.writeFileSync(outputFile, Buffer.concat(chunks));
        resolve();
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(ssml);
    req.end();
  });
}

export function getTTSFilePath(hash: string): string | null {
  const mp3File = path.join(CACHE_DIR, `${hash}.mp3`);
  if (fs.existsSync(mp3File)) return mp3File;
  return null;
}
