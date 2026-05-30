import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';

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
  const wavFile = path.join(CACHE_DIR, `${hash}.wav`);

  if (fs.existsSync(wavFile)) {
    console.log('[TTS] 命中缓存:', hash, `(${(fs.statSync(wavFile).size / 1024).toFixed(1)}KB)`);
    return `/api/tts/${hash}`;
  }

  console.log('[TTS] 开始合成...', `"${text.slice(0, 40)}..."`);
  ensureCacheDir();

  await synthesizeWindows(text, wavFile);

  const size = (fs.statSync(wavFile).size / 1024).toFixed(1);
  console.log('[TTS] 合成完成:', hash, `(${size}KB)`);
  return `/api/tts/${hash}`;
}

function synthesizeWindows(text: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Escape special characters for PowerShell
    const escaped = text
      .replace(/"/g, '""')
      .replace(/'/g, "''");

    // PowerShell script: use System.Speech to synthesize to WAV
    const psScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# Select Chinese voice if available
$zhVoice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'zh-*' } | Select-Object -First 1
if ($zhVoice) { $synth.SelectVoice($zhVoice.VoiceInfo.Name) }

$synth.SetOutputToWaveFile('${outputFile.replace(/\\/g, '\\\\')}')
$synth.Speak('${escaped}')
$synth.Dispose()
`;

    const tmpScript = join(tmpdir(), `tts-${randomUUID()}.ps1`);
    writeFileSync(tmpScript, psScript, 'utf-16le'); // PowerShell needs UTF-16LE with BOM

    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    child.on('close', (code: number) => {
      try { unlinkSync(tmpScript); } catch { /* ignore */ }
      if (code !== 0) {
        console.error('[TTS] PowerShell error:', stderr);
        reject(new Error(`TTS 合成失败: ${stderr.slice(0, 200)}`));
        return;
      }
      resolve();
    });

    child.on('error', (err: Error) => {
      try { unlinkSync(tmpScript); } catch { /* ignore */ }
      console.error('[TTS] 启动失败:', err.message);
      reject(err);
    });
  });
}

export function getTTSFilePath(hash: string): string | null {
  const wavFile = path.join(CACHE_DIR, `${hash}.wav`);
  if (fs.existsSync(wavFile)) return wavFile;
  return null;
}
