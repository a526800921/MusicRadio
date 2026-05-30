import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import WebSocket from 'ws';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'tts');
const VOICE = 'zh-CN-XiaoxiaoNeural';
const WSS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

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
    console.log('[TTS] 命中缓存:', hash, `(${(fs.statSync(mp3File).size / 1024).toFixed(1)}KB)`);
    return `/api/tts/${hash}`;
  }

  console.log('[TTS] 开始合成...', `"${text.slice(0, 40)}..."`);
  ensureCacheDir();

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="${VOICE}">
      <prosody rate="+10%" pitch="+0%">${text}</prosody>
    </voice>
  </speak>`;

  await downloadViaWS(ssml, mp3File);
  const size = (fs.statSync(mp3File).size / 1024).toFixed(1);
  console.log('[TTS] 合成完成:', hash, `(${size}KB)`);
  return `/api/tts/${hash}`;
}

function downloadViaWS(ssml: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      },
    });

    const chunks: Buffer[] = [];
    const reqId = randomUUID();
    let configSent = false;

    ws.on('open', () => {
      // Send config message
      const config = {
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      };
      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/json; charset=utf-8\r\nPath:ssml\r\n\r\n` +
        JSON.stringify(config)
      );
      configSent = true;
    });

    ws.on('message', (data: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        // Text messages contain metadata headers, skip
        const text = data.toString();
        if (text.includes('Path:turn.end')) {
          // Synthesis complete
          ws.close();
        }
        return;
      }

      // Binary data: skip header bytes to get raw audio
      // Edge TTS sends binary with a header prefix
      const str = data.toString('utf-8', 0, Math.min(200, data.length));
      const headerEnd = str.indexOf('Path:audio\r\n');
      if (headerEnd !== -1) {
        const audioStart = headerEnd + 'Path:audio\r\n'.length;
        chunks.push(data.subarray(audioStart));
      } else {
        chunks.push(data);
      }
    });

    ws.on('close', () => {
      if (chunks.length > 0) {
        const total = Buffer.concat(chunks);
        console.log('[TTS] 收到音频:', total.length, 'bytes');
        fs.writeFileSync(outputFile, total);
        resolve();
      } else {
        reject(new Error('Edge TTS: no audio data received'));
      }
    });

    ws.on('error', (err) => {
      console.error('[TTS] WebSocket error:', err.message);
      reject(err);
    });

    // Send SSML after a short delay to let server process config
    const checkAndSend = setInterval(() => {
      if (configSent && ws.readyState === WebSocket.OPEN) {
        clearInterval(checkAndSend);
        ws.send(
          `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` + ssml
        );
      }
    }, 10);

    setTimeout(() => {
      clearInterval(checkAndSend);
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.close();
        reject(new Error('Edge TTS timeout'));
      }
    }, 15000);
  });
}

export function getTTSFilePath(hash: string): string | null {
  const mp3File = path.join(CACHE_DIR, `${hash}.mp3`);
  if (fs.existsSync(mp3File)) return mp3File;
  return null;
}
