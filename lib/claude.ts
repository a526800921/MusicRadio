import { spawn, execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

function findBash(): string {
  // Common Git Bash paths on Windows
  const candidates = [
    'D:\\Git\\usr\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // Fallback: try to find via where command, or just 'bash'
  try {
    const found = execSync('where bash 2>nul', { encoding: 'utf-8', shell: 'cmd.exe' }).trim().split('\n')[0];
    if (found) return found;
  } catch { /* ignore */ }
  return 'bash';
}

export interface ClaudeOutput {
  say: string;
  play: { song_id: string; song_name: string; artist: string };
  reason: string;
  segue: string;
}

export interface PromptInput {
  persona: string;
  userContext: string;
  timeContext: string;
  recentHistory: string;
  userInput: string;
}

export function buildPrompt(input: PromptInput): string {
  return [
    input.persona,
    '',
    '## 用户画像',
    input.userContext,
    '',
    '## 当前上下文',
    input.timeContext,
    '',
    '## 最近播放',
    input.recentHistory,
    '',
    '## 用户请求',
    input.userInput,
  ].join('\n');
}

export function parseClaudeOutput(raw: string): ClaudeOutput {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('无法解析 Claude 输出：未找到 JSON');

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('无法解析 Claude 输出：JSON 格式错误');
  }

  if (!parsed.say || !parsed.play?.song_id || !parsed.play?.song_name || !parsed.play?.artist) {
    throw new Error('无法解析 Claude 输出：缺少必要字段 (say, play.song_id, play.song_name, play.artist)');
  }

  return {
    say: parsed.say,
    play: {
      song_id: String(parsed.play.song_id),
      song_name: parsed.play.song_name,
      artist: parsed.play.artist,
    },
    reason: parsed.reason || '',
    segue: parsed.segue || '',
  };
}

export function callClaude(
  prompt: string,
  options?: { timeout?: number; model?: string }
): Promise<ClaudeOutput> {
  const timeout = options?.timeout ?? 120000;
  const model = options?.model || process.env.CLAUDE_MODEL || '';
  const modelFlag = model ? `--model "${model}"` : '';

  return new Promise((resolve, reject) => {
    const tmpFile = join(tmpdir(), `claude-prompt-${randomUUID()}.txt`);
    const unixPath = tmpFile.replace(/\\/g, '/');
    writeFileSync(tmpFile, prompt, 'utf-8');

    const bashPath = findBash();
    const child = spawn(bashPath, ['-c', `claude -p ${modelFlag} < "${unixPath}"`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: process.env.PATH },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      reject(new Error('Claude 调用超时'));
    }, timeout);

    child.on('close', (code: number) => {
      clearTimeout(timer);
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      if (code !== 0) {
        reject(new Error(`Claude 进程退出码 ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(parseClaudeOutput(stdout));
      } catch (e: any) {
        reject(new Error(`输出解析失败: ${e.message}\n输出: ${stdout.slice(0, 500)}`));
      }
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      reject(new Error(`无法启动 Claude CLI: ${err.message}`));
    });
  });
}
