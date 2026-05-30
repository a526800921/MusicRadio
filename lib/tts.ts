import { spawn } from 'child_process';
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
    // Use base64 to avoid encoding hell with Chinese text in PowerShell
    const psCode = `
param($text, $outputFile)
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$zh = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'zh-*' } | Select-Object -First 1
if ($zh) { $synth.SelectVoice($zh.VoiceInfo.Name) }
$dir = Split-Path $outputFile -Parent
if ($dir -and !(Test-Path $dir)) { New-Item -Force -ItemType Directory $dir | Out-Null }
$synth.SetOutputToWaveFile($outputFile)
$synth.Speak($text)
$synth.Dispose()
`;
    // Encode PS script as UTF-16LE base64 for EncodedCommand
    const psBytes = Buffer.from(psCode, 'utf-8');
    // Convert to UTF-16LE
    const utf16le = Buffer.alloc(psBytes.length * 2 + 2);
    utf16le.writeUInt16LE(0xFEFF, 0); // BOM
    for (let i = 0; i < psBytes.length; i++) {
      utf16le.writeUInt16LE(psBytes[i], 2 + i * 2);
    }
    const b64 = utf16le.toString('base64');

    // Pass text as argument to avoid encoding issues in script
    const child = spawn('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', b64,
      '-text', text,
      '-outputFile', outputFile,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('TTS 合成超时'));
    }, 30000);

    child.on('close', (code: number) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error('[TTS] PowerShell exit:', code);
        console.error('[TTS] stderr:', stderr.slice(0, 300));
        reject(new Error(`TTS 合成失败 (exit ${code})`));
        return;
      }
      if (!fs.existsSync(outputFile)) {
        console.error('[TTS] 文件未生成:', outputFile);
        console.error('[TTS] stdout:', stdout.slice(0, 300));
        reject(new Error('TTS 音频文件未生成'));
        return;
      }
      console.log('[TTS] 文件大小:', (fs.statSync(outputFile).size / 1024).toFixed(1), 'KB');
      resolve();
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
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
