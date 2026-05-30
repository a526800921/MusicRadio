# 个人 AI 电台实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建本地 AI 电台 MVP——用户用自然语言请求推荐，Claude 推理推荐歌曲，网易云提供播放链接，Web 播放器播放并展示推荐理由。

**Architecture:** 四层结构——外部上下文(品味文件/Claude CLI/网易云API) → 本地大脑(ROUTER/CONTEXT/CLAUDE/SCHEDULER/STATE) → 运行时聚合(Claude推理) → 交互界面(Next.js Web播放器)。核心链路：用户输入 → 意图路由 → 提示词组装 → Claude推理 → 网易云解析链接 → 播放器播放。

**Tech Stack:** Next.js Pages Router + TypeScript + Tailwind CSS + Vitest + child_process.spawn(Claude CLI) + NeteaseCloudMusicApi

---

## 阶段划分

| 阶段 | 目标 | 完成标准 | 并行策略 |
|------|------|----------|----------|
| P1 | 项目基础设施 | `npm run dev` 能启动，Vitest 能跑 | 单线程（初始化无并行空间） |
| P2 | 数据层 (lib/) | 全部 6 个模块的单测通过 | **5 个 agent 并行**（独立模块） |
| P3 | API 层 | 全部 5 个端点可用，集成测试通过 | **3 个 agent 并行**（独立端点分组） |
| P4 | 前端界面 | 完整 Web 播放器可用 | **3 个 agent 并行**（独立组件） |
| P5 | 集成验证 | 端到端链路跑通，手工验收 | 单线程 |

**阶段门禁：每个阶段全部任务完成且测试通过，才能进入下一阶段。**

---

## Phase 1: 项目基础设施

**Goal:** Next.js 项目能启动，TDD 框架就绪，用户品味文件和数据文件就位。

### Task 1.1: 初始化 Next.js 项目

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`
- Create: `pages/_app.tsx`, `pages/index.tsx`
- Create: `vitest.config.ts`

- [ ] **Step 1: 用 create-next-app 初始化项目**

```bash
cd E:\work\cc-music
npx create-next-app@latest . --typescript --tailwind --eslint --src-dir=false --app=false --import-alias="@/*" --no-turbopack --use-npm
```

Expected: 项目文件生成，`package.json` 包含 next, react, typescript, tailwindcss。

- [ ] **Step 2: 安装测试依赖**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: 创建 vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
```

- [ ] **Step 4: 添加 test 脚本到 package.json**

修改 `package.json`，在 `scripts` 中添加：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 验证项目能启动**

```bash
npm run dev
```

Expected: Next.js 在 localhost:3000 启动。

- [ ] **Step 6: 验证测试框架可用**

```bash
npm test
```

Expected: Vitest 运行成功（0 个测试）。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: init Next.js + TypeScript + Tailwind + Vitest project scaffold"
```

---

### Task 1.2: 创建用户品味文件和数据文件

**Files:**
- Create: `user/taste.md`, `user/routines.md`, `user/playlists.json`, `user/mood-rules.md`
- Create: `prompt/persona.md`
- Create: `data/state.json`

- [ ] **Step 1: 创建 user/taste.md**

```markdown
# 我的音乐品味

## 喜欢的艺人
- 周杰伦
- 林俊杰
- 陈奕迅
- Taylor Swift
- Coldplay

## 喜欢的风格
- 华语流行
- 民谣
- 独立摇滚
- R&B
- 电子

## 年代偏好
- 主要听 2000-2020 年代的华语音乐
- 也听 2010 年代后的欧美独立音乐

## 其他偏好
- 喜欢歌词有深度的歌
- 工作时候倾向纯音乐或轻音乐
- 晚上喜欢安静的氛围音乐
```

- [ ] **Step 2: 创建 user/routines.md**

```markdown
# 日常作息

## 早上 (6:00-9:00)
- 起床后需要提神的音乐
- 偏好节奏明快、BPM 较高的歌曲

## 上午工作 (9:00-12:00)
- 适合专注工作的背景音乐
- 偏好纯音乐、轻音乐、后摇

## 下午 (12:00-18:00)
- 午后容易犯困，需要一些有活力的音乐
- 偏好流行、摇滚

## 晚上 (18:00-23:00)
- 放松时段
- 偏好 R&B、爵士、氛围音乐

## 深夜 (23:00-6:00)
- 安静舒缓
- 偏好民谣、钢琴曲、环境音乐
```

- [ ] **Step 3: 创建 user/playlists.json**

```json
{
  "favorites": {
    "name": "我的最爱",
    "songs": []
  },
  "work": {
    "name": "工作专注",
    "songs": []
  },
  "relax": {
    "name": "放松时刻",
    "songs": []
  }
}
```

- [ ] **Step 4: 创建 user/mood-rules.md**

```markdown
# 情绪-音乐映射

## 开心时
- 加一点节奏更快的歌
- BPM > 120

## 疲惫时
- 切换到舒缓放松
- BPM < 90

## 专注时
- 纯音乐优先
- 音量稍低

## 平静时
- 维持当前风格
- 适当探索新歌
```

- [ ] **Step 5: 创建 prompt/persona.md**

```markdown
# Claudio 角色设定

你是一个名叫 Claudio 的 AI 电台 DJ。你的风格：
- 像一个懂音乐的朋友，不装腔作势
- 推荐时简单解释为什么选这首歌
- 语气温暖自然，偶尔幽默
- 根据用户的品味和当前时段推荐合适的音乐

## 输出格式
你必须严格输出 JSON，不要任何额外文字：
{
  "say": "DJ 口播文案（1-2句话，自然口语化）",
  "play": {
    "song_id": "网易云歌曲ID（数字字符串）",
    "song_name": "歌曲名",
    "artist": "艺人名"
  },
  "reason": "推荐理由（简短1句话）",
  "segue": "转场衔接语（用于引出歌曲）"
}
```

- [ ] **Step 6: 创建 data/state.json**

```json
{
  "plays": [],
  "messages": [],
  "prefs": {
    "favorite_genres": [],
    "favorite_artists": []
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add user/ prompt/ data/
git commit -m "feat: add user taste files, persona prompt, and initial state"
```

---

## Phase 2: 数据层 (lib/)

**Goal:** 全部 6 个 lib 模块完成，单元测试全部通过。

> **并行策略：** Task 2.1 (state)、2.2 (scheduler)、2.3 (netease)、2.4 (claude)、2.5 (router) 可各派一个 agent 并行开发。Task 2.6 (context) 依赖 state 和 scheduler，需等 2.1 和 2.2 完成后串行。

---

### Task 2.1: lib/state.ts — JSON 文件持久化读写

**Files:**
- Create: `lib/state.ts`
- Create: `lib/__tests__/state.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// lib/__tests__/state.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { readState, writeState, addPlay, addMessage } from '../state';

const TEST_STATE_PATH = path.join(process.cwd(), 'data', '.test-state.json');

describe('state', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_STATE_PATH)) {
      fs.unlinkSync(TEST_STATE_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_STATE_PATH)) {
      fs.unlinkSync(TEST_STATE_PATH);
    }
  });

  describe('readState', () => {
    it('returns default state when file does not exist', () => {
      const state = readState();
      expect(state.plays).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.prefs).toEqual({ favorite_genres: [], favorite_artists: [] });
    });

    it('reads existing state from file', () => {
      const testState = { plays: [{ time: '2026-01-01', song_id: '123', song_name: 'Test', artist: 'Test', skipped: false }], messages: [], prefs: { favorite_genres: [], favorite_artists: [] } };
      fs.writeFileSync(path.join(process.cwd(), 'data', 'state.json'), JSON.stringify(testState));
      const state = readState();
      expect(state.plays).toHaveLength(1);
    });
  });

  describe('addPlay', () => {
    it('adds a play record and persists', () => {
      const result = addPlay({ time: '2026-01-01T00:00:00Z', song_id: '456', song_name: 'Song', artist: 'Artist', skipped: false });
      expect(result.plays).toHaveLength(1);
      expect(result.plays[0].song_id).toBe('456');

      const persisted = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'state.json'), 'utf-8'));
      expect(persisted.plays).toHaveLength(1);
    });
  });

  describe('addMessage', () => {
    it('adds a message and persists', () => {
      const result = addMessage({ role: 'user', content: '推荐一首歌', time: '2026-01-01T00:00:00Z' });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('推荐一首歌');
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run lib/__tests__/state.test.ts
```

Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现 readState 和 writeState**

```typescript
// lib/state.ts
import fs from 'fs';
import path from 'path';

const STATE_PATH = path.join(process.cwd(), 'data', 'state.json');

export interface PlayRecord {
  time: string;
  song_id: string;
  song_name: string;
  artist: string;
  skipped: boolean;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export interface Prefs {
  favorite_genres: string[];
  favorite_artists: string[];
}

export interface AppState {
  plays: PlayRecord[];
  messages: Message[];
  prefs: Prefs;
}

const defaultState: AppState = {
  plays: [],
  messages: [],
  prefs: { favorite_genres: [], favorite_artists: [] },
};

export function readState(): AppState {
  try {
    if (!fs.existsSync(STATE_PATH)) return { ...defaultState, plays: [], messages: [], prefs: { favorite_genres: [], favorite_artists: [] } };
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...defaultState, plays: [], messages: [], prefs: { favorite_genres: [], favorite_artists: [] } };
  }
}

export function writeState(state: AppState): void {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

export function addPlay(play: PlayRecord): AppState {
  const state = readState();
  state.plays.push(play);
  writeState(state);
  return state;
}

export function addMessage(msg: Message): AppState {
  const state = readState();
  state.messages.push(msg);
  writeState(state);
  return state;
}

export function getRecentPlays(limit = 20): PlayRecord[] {
  const state = readState();
  return state.plays.slice(-limit).reverse();
}

export function getRecentMessages(limit = 50): Message[] {
  const state = readState();
  return state.messages.slice(-limit);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run lib/__tests__/state.test.ts
```

Expected: 4 tests PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/state.ts lib/__tests__/state.test.ts
git commit -m "feat: implement state persistence module with JSON file read/write"
```

---

### Task 2.2: lib/scheduler.ts — 场景感知（时段检测）

**Files:**
- Create: `lib/scheduler.ts`
- Create: `lib/__tests__/scheduler.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// lib/__tests__/scheduler.test.ts
import { describe, it, expect } from 'vitest';
import { getTimeOfDay, getContextLabel } from '../scheduler';

describe('getTimeOfDay', () => {
  it('returns 早上 for 6-11', () => {
    expect(getTimeOfDay(6)).toBe('早上');
    expect(getTimeOfDay(8)).toBe('早上');
    expect(getTimeOfDay(11)).toBe('早上');
  });

  it('returns 下午 for 12-17', () => {
    expect(getTimeOfDay(12)).toBe('下午');
    expect(getTimeOfDay(15)).toBe('下午');
    expect(getTimeOfDay(17)).toBe('下午');
  });

  it('returns 晚上 for 18-22', () => {
    expect(getTimeOfDay(18)).toBe('晚上');
    expect(getTimeOfDay(20)).toBe('晚上');
    expect(getTimeOfDay(22)).toBe('晚上');
  });

  it('returns 深夜 for 23-5', () => {
    expect(getTimeOfDay(23)).toBe('深夜');
    expect(getTimeOfDay(0)).toBe('深夜');
    expect(getTimeOfDay(3)).toBe('深夜');
    expect(getTimeOfDay(5)).toBe('深夜');
  });

  it('uses current hour when no argument', () => {
    const result = getTimeOfDay();
    expect(['早上', '下午', '晚上', '深夜']).toContain(result);
  });
});

describe('getContextLabel', () => {
  it('returns label with current time period', () => {
    const label = getContextLabel();
    expect(label).toMatch(/^当前时段：(早上|下午|晚上|深夜)$/);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run lib/__tests__/scheduler.test.ts
```

- [ ] **Step 3: 实现 scheduler.ts**

```typescript
// lib/scheduler.ts
export type TimeOfDay = '早上' | '下午' | '晚上' | '深夜';

export function getTimeOfDay(hour?: number): TimeOfDay {
  const h = hour ?? new Date().getHours();
  if (h >= 6 && h < 12) return '早上';
  if (h >= 12 && h < 18) return '下午';
  if (h >= 18 && h < 23) return '晚上';
  return '深夜';
}

export function getContextLabel(): string {
  return `当前时段：${getTimeOfDay()}`;
}

export function getTimeContext(): { timeOfDay: TimeOfDay; label: string } {
  const timeOfDay = getTimeOfDay();
  return { timeOfDay, label: `当前时段：${timeOfDay}` };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run lib/__tests__/scheduler.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/scheduler.ts lib/__tests__/scheduler.test.ts
git commit -m "feat: implement scheduler with time-of-day detection"
```

---

### Task 2.3: lib/netease.ts — 网易云 API 封装

**Files:**
- Create: `lib/netease.ts`
- Create: `lib/__tests__/netease.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// lib/__tests__/netease.test.ts
import { describe, it, expect } from 'vitest';
import { searchSongs, formatSearchResult } from '../netease';

describe('formatSearchResult', () => {
  it('formats raw search result into simplified structure', () => {
    const raw = {
      result: {
        songs: [
          { id: 123, name: '晴天', ar: [{ name: '周杰伦' }], al: { name: '叶惠美' }, dt: 269000 },
          { id: 456, name: '七里香', ar: [{ name: '周杰伦' }], al: { name: '七里香' }, dt: 299000 },
        ],
      },
    };
    const result = formatSearchResult(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: '123', name: '晴天', artist: '周杰伦', album: '叶惠美' });
    expect(result[1]).toEqual({ id: '456', name: '七里香', artist: '周杰伦', album: '七里香' });
  });

  it('returns empty array for empty result', () => {
    expect(formatSearchResult({ result: { songs: [] } })).toEqual([]);
  });

  it('returns empty array for missing result', () => {
    expect(formatSearchResult({})).toEqual([]);
  });
});

describe('searchSongs', () => {
  it('exists as a function', () => {
    expect(typeof searchSongs).toBe('function');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run lib/__tests__/netease.test.ts
```

- [ ] **Step 3: 实现 netease.ts**

```typescript
// lib/netease.ts
const NETEASE_BASE = process.env.NETEASE_API_URL || 'http://localhost:3000';

export interface SongInfo {
  id: string;
  name: string;
  artist: string;
  album: string;
}

export interface SongUrlInfo {
  id: string;
  url: string;
  name: string;
  artist: string;
}

export async function searchSongs(keyword: string, limit = 10): Promise<SongInfo[]> {
  try {
    const res = await fetch(`${NETEASE_BASE}/search?keywords=${encodeURIComponent(keyword)}&limit=${limit}`);
    const data = await res.json();
    return formatSearchResult(data);
  } catch {
    return [];
  }
}

export function formatSearchResult(data: any): SongInfo[] {
  const songs = data?.result?.songs;
  if (!songs || !Array.isArray(songs)) return [];
  return songs.map((s: any) => ({
    id: String(s.id),
    name: s.name,
    artist: (s.ar || []).map((a: any) => a.name).join('/'),
    album: s.al?.name || '',
  }));
}

export async function getSongUrl(songId: string): Promise<string | null> {
  try {
    const res = await fetch(`${NETEASE_BASE}/song/url/v1?id=${songId}&level=standard`);
    const data = await res.json();
    return data?.data?.[0]?.url || null;
  } catch {
    return null;
  }
}

export async function getSongUrlWithInfo(songId: string, name: string, artist: string): Promise<SongUrlInfo | null> {
  const url = await getSongUrl(songId);
  if (!url) return null;
  return { id: songId, url, name, artist };
}

export async function getLyric(songId: string): Promise<string | null> {
  try {
    const res = await fetch(`${NETEASE_BASE}/lyric?id=${songId}`);
    const data = await res.json();
    return data?.lrc?.lyric || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run lib/__tests__/netease.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/netease.ts lib/__tests__/netease.test.ts
git commit -m "feat: implement netease music API wrapper"
```

---

### Task 2.4: lib/claude.ts — Claude CLI 子进程适配器

**Files:**
- Create: `lib/claude.ts`
- Create: `lib/__tests__/claude.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// lib/__tests__/claude.test.ts
import { describe, it, expect } from 'vitest';
import { parseClaudeOutput, buildPrompt } from '../claude';

describe('parseClaudeOutput', () => {
  it('parses valid JSON from Claude output', () => {
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

  it('throws on invalid JSON', () => {
    expect(() => parseClaudeOutput('no json here at all')).toThrow('无法解析 Claude 输出');
  });

  it('throws when required fields missing', () => {
    expect(() => parseClaudeOutput('{"say":"hello"}')).toThrow();
  });
});

describe('buildPrompt', () => {
  it('combines persona, user context, and scheduler context', () => {
    const prompt = buildPrompt({
      persona: 'You are a DJ.',
      userContext: '喜欢摇滚',
      timeContext: '当前时段：晚上',
      recentHistory: '最近播放：晴天',
    });
    expect(prompt).toContain('You are a DJ.');
    expect(prompt).toContain('喜欢摇滚');
    expect(prompt).toContain('当前时段：晚上');
    expect(prompt).toContain('最近播放：晴天');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run lib/__tests__/claude.test.ts
```

- [ ] **Step 3: 实现 claude.ts**

```typescript
// lib/claude.ts
import { spawn } from 'child_process';

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
  // 找 JSON 块（可能在文字中间）
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

export function callClaude(prompt: string, timeout = 60000): Promise<ClaudeOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Claude 调用超时'));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude 进程退出码 ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(parseClaudeOutput(stdout));
      } catch (e: any) {
        reject(new Error(`Claude 输出解析失败: ${e.message}\n输出: ${stdout.slice(0, 500)}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`无法启动 Claude CLI: ${err.message}`));
    });
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run lib/__tests__/claude.test.ts
```

Expected: buildPrompt 和 parseClaudeOutput 测试全部 PASS。（callClaude 涉及实际子进程调用，单元测试不覆盖）

- [ ] **Step 5: Commit**

```bash
git add lib/claude.ts lib/__tests__/claude.test.ts
git commit -m "feat: implement Claude CLI adapter with output parsing"
```

---

### Task 2.5: lib/router.ts — 意图分发

**Files:**
- Create: `lib/router.ts`
- Create: `lib/__tests__/router.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// lib/__tests__/router.test.ts
import { describe, it, expect } from 'vitest';
import { routeIntent, IntentType } from '../router';

describe('routeIntent', () => {
  it('routes play control commands as CONTROL', () => {
    expect(routeIntent('播放').type).toBe('CONTROL');
    expect(routeIntent('暂停').type).toBe('CONTROL');
    expect(routeIntent('下一首').type).toBe('CONTROL');
    expect(routeIntent('音量调大').type).toBe('CONTROL');
  });

  it('routes search-like requests as SEARCH', () => {
    expect(routeIntent('搜索周杰伦的晴天').type).toBe('SEARCH');
    expect(routeIntent('帮我搜一下稻香').type).toBe('SEARCH');
    expect(routeIntent('找陈奕迅的歌').type).toBe('SEARCH');
    expect(routeIntent('有没有叫七里香的歌').type).toBe('SEARCH');
  });

  it('routes natural language requests as AI', () => {
    expect(routeIntent('推荐一首适合现在听的歌').type).toBe('AI');
    expect(routeIntent('给我推荐几首提神的歌').type).toBe('AI');
    expect(routeIntent('今天心情不好，想听点开心的歌').type).toBe('AI');
    expect(routeIntent('最近有什么好听的').type).toBe('AI');
    expect(routeIntent('随便放一首').type).toBe('AI');
    expect(routeIntent('换一首类似风格的').type).toBe('AI');
  });

  it('extracts search keyword for SEARCH intent', () => {
    const result = routeIntent('搜索周杰伦的晴天');
    expect(result.keyword).toBe('周杰伦 晴天');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run lib/__tests__/router.test.ts
```

- [ ] **Step 3: 实现 router.ts**

```typescript
// lib/router.ts

export type IntentType = 'CONTROL' | 'SEARCH' | 'AI';

export interface RouteResult {
  type: IntentType;
  keyword?: string;
}

const CONTROL_KEYWORDS = /^(播放|暂停|下一首|上一首|音量|停止|继续)$/;
const SEARCH_KEYWORDS = /^(搜|搜索|找|有没有|帮我搜|帮我找)/;

export function routeIntent(message: string): RouteResult {
  const trimmed = message.trim();

  // 播放控制
  if (CONTROL_KEYWORDS.test(trimmed)) {
    return { type: 'CONTROL' };
  }

  // 音乐搜索
  if (SEARCH_KEYWORDS.test(trimmed)) {
    const keyword = trimmed
      .replace(/^(搜索|搜|找|帮我搜一下|帮我搜|帮我找|有没有叫?)/, '')
      .replace(/[的的歌]$/, '')
      .trim();
    return { type: 'SEARCH', keyword: keyword || trimmed };
  }

  // 自然语言推荐 → AI
  return { type: 'AI' };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run lib/__tests__/router.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/router.ts lib/__tests__/router.test.ts
git commit -m "feat: implement intent router for CONTROL/SEARCH/AI routing"
```

---

### Task 2.6: lib/context.ts — 提示词组装

**Files:**
- Create: `lib/context.ts`
- Create: `lib/__tests__/context.test.ts`

**依赖:** Task 2.1 (state) 和 Task 2.2 (scheduler) 必须先完成。

- [ ] **Step 1: 写失败测试**

```typescript
// lib/__tests__/context.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { assembleContext } from '../context';

describe('assembleContext', () => {
  const userDir = path.join(process.cwd(), 'user');

  beforeEach(() => {
    // Ensure test user files exist
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  });

  it('reads taste.md and includes it in context', () => {
    const ctx = assembleContext();
    expect(ctx.userContext).toContain('我的音乐品味');
  });

  it('includes time context', () => {
    const ctx = assembleContext();
    expect(ctx.timeContext).toMatch(/^当前时段：(早上|下午|晚上|深夜)$/);
  });

  it('includes persona', () => {
    const ctx = assembleContext();
    expect(ctx.persona).toContain('Claudio');
  });

  it('reads play history from state', () => {
    const ctx = assembleContext();
    expect(typeof ctx.recentHistory).toBe('string');
  });

  it('returns all required fields', () => {
    const ctx = assembleContext();
    expect(ctx).toHaveProperty('persona');
    expect(ctx).toHaveProperty('userContext');
    expect(ctx).toHaveProperty('timeContext');
    expect(ctx).toHaveProperty('recentHistory');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run lib/__tests__/context.test.ts
```

- [ ] **Step 3: 实现 context.ts**

```typescript
// lib/context.ts
import fs from 'fs';
import path from 'path';
import { readState, getRecentPlays, getRecentMessages } from './state';
import { getContextLabel } from './scheduler';

export interface AssembledContext {
  persona: string;
  userContext: string;
  timeContext: string;
  recentHistory: string;
}

export function assembleContext(): AssembledContext {
  const persona = readFile('prompt/persona.md');
  const userContext = buildUserContext();
  const timeContext = getContextLabel();
  const recentHistory = buildRecentHistory();

  return { persona, userContext, timeContext, recentHistory };
}

function readFile(relativePath: string): string {
  const fullPath = path.join(process.cwd(), relativePath);
  try {
    return fs.readFileSync(fullPath, 'utf-8').trim();
  } catch {
    return '';
  }
}

function buildUserContext(): string {
  const parts: string[] = [];
  const taste = readFile('user/taste.md');
  if (taste) parts.push(taste);

  const routines = readFile('user/routines.md');
  if (routines) parts.push(routines);

  const moodRules = readFile('user/mood-rules.md');
  if (moodRules) parts.push(moodRules);

  return parts.join('\n\n');
}

function buildRecentHistory(): string {
  const plays = getRecentPlays(10);
  if (plays.length === 0) return '暂无播放历史';

  return plays
    .map((p) => `- ${p.time}: ${p.song_name} - ${p.artist}${p.skipped ? ' (跳过)' : ''}`)
    .join('\n');
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run lib/__tests__/context.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/context.ts lib/__tests__/context.test.ts
git commit -m "feat: implement context assembler for system prompt construction"
```

---

## Phase 3: API 层

**Goal:** 全部 5 个 API 端点可用，集成测试通过。

> **并行策略：** Task 3.1 (/api/now)、3.2 (/api/search + /api/taste + /api/history)、3.3 (/api/chat) 可分 3 个 agent。其中 3.3 依赖全部 lib 模块且是核心链路，代码量最大。

---

### Task 3.1: /api/now — 当前播放状态

**Files:**
- Create: `pages/api/now.ts`
- Create: `pages/api/__tests__/now.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// pages/api/__tests__/now.test.ts
import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../now';

describe('GET /api/now', () => {
  it('returns 200 with now-playing data', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('current');
    expect(data).toHaveProperty('history');
  });

  it('returns 405 for non-GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

先安装 `node-mocks-http`：
```bash
npm install -D node-mocks-http
npx vitest run pages/api/__tests__/now.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现 /api/now**

```typescript
// pages/api/now.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { readState, getRecentPlays } from '@/lib/state';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const state = readState();
  const current = state.plays.length > 0 ? state.plays[state.plays.length - 1] : null;
  const history = getRecentPlays(10);

  res.status(200).json({ current, history });
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run pages/api/__tests__/now.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add pages/api/now.ts pages/api/__tests__/now.test.ts package.json package-lock.json
git commit -m "feat: add GET /api/now endpoint for current playback state"
```

---

### Task 3.2: /api/search, /api/taste, /api/history

**Files:**
- Create: `pages/api/search.ts`, `pages/api/taste.ts`, `pages/api/history.ts`
- Create: `pages/api/__tests__/search.test.ts`, `pages/api/__tests__/taste.test.ts`, `pages/api/__tests__/history.test.ts`

- [ ] **Step 1: 写失败测试（3 个并行）**

```typescript
// pages/api/__tests__/search.test.ts
import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../search';

describe('GET /api/search', () => {
  it('returns 400 when q is missing', async () => {
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 200 with search results', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { q: '晴天' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('songs');
    expect(Array.isArray(data.songs)).toBe(true);
  });
});
```

```typescript
// pages/api/__tests__/taste.test.ts
import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../taste';

describe('GET /api/taste', () => {
  it('returns taste data', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('taste');
  });
});
```

```typescript
// pages/api/__tests__/history.test.ts
import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../history';

describe('GET /api/history', () => {
  it('returns play history', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('plays');
    expect(Array.isArray(data.plays)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run pages/api/__tests__/search.test.ts pages/api/__tests__/taste.test.ts pages/api/__tests__/history.test.ts
```

Expected: 3 tests FAIL。

- [ ] **Step 3: 实现 3 个 API 端点**

```typescript
// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { searchSongs } from '@/lib/netease';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: '缺少搜索关键词 ?q=' });

  const songs = await searchSongs(q);
  res.status(200).json({ songs });
}
```

```typescript
// pages/api/taste.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const tastePath = path.join(process.cwd(), 'user', 'taste.md');
  let taste = '';
  try { taste = fs.readFileSync(tastePath, 'utf-8'); } catch { /* empty */ }

  res.status(200).json({ taste });
}
```

```typescript
// pages/api/history.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecentPlays } from '@/lib/state';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const plays = getRecentPlays(50);
  res.status(200).json({ plays });
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run pages/api/__tests__/search.test.ts pages/api/__tests__/taste.test.ts pages/api/__tests__/history.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add pages/api/search.ts pages/api/taste.ts pages/api/history.ts pages/api/__tests__/
git commit -m "feat: add /api/search, /api/taste, /api/history endpoints"
```

---

### Task 3.3: /api/chat — 核心推荐链路

**Files:**
- Create: `pages/api/chat.ts`
- Create: `pages/api/__tests__/chat.test.ts`

**依赖:** Phase 2 全部完成。

- [ ] **Step 1: 写失败测试**

```typescript
// pages/api/__tests__/chat.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../chat';

describe('POST /api/chat', () => {
  it('returns 400 when message is missing', async () => {
    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 400 when message is empty string', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: '' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 405 for non-POST', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns correct response structure for valid request', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: '推荐一首歌' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    // Even if Claude call fails, should get an error response with proper structure
    expect(data).toHaveProperty('error');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run pages/api/__tests__/chat.test.ts
```

- [ ] **Step 3: 实现 /api/chat**

```typescript
// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { routeIntent } from '@/lib/router';
import { assembleContext } from '@/lib/context';
import { buildPrompt, callClaude } from '@/lib/claude';
import { addPlay, addMessage } from '@/lib/state';
import { getSongUrlWithInfo } from '@/lib/netease';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: '缺少 message 参数' });
  }

  try {
    // 1. 意图路由
    const route = routeIntent(message);

    // 非 AI 路径在 client 侧处理，chat 只处理 AI 路径
    if (route.type !== 'AI') {
      return res.status(200).json({ type: route.type, keyword: route.keyword });
    }

    // 2. 组装上下文
    const ctx = assembleContext();

    // 3. 构建 prompt
    const prompt = buildPrompt({
      persona: ctx.persona,
      userContext: ctx.userContext,
      timeContext: ctx.timeContext,
      recentHistory: ctx.recentHistory,
      userInput: message,
    });

    // 4. 调用 Claude
    const output = await callClaude(prompt);

    // 5. 获取播放链接
    const songInfo = await getSongUrlWithInfo(
      output.play.song_id,
      output.play.song_name,
      output.play.artist,
    );

    // 6. 持久化
    addPlay({
      time: new Date().toISOString(),
      song_id: output.play.song_id,
      song_name: output.play.song_name,
      artist: output.play.artist,
      skipped: false,
    });
    addMessage({ role: 'user', content: message, time: new Date().toISOString() });
    addMessage({ role: 'assistant', content: output.say, time: new Date().toISOString() });

    // 7. 返回
    res.status(200).json({
      say: output.say,
      play: {
        id: output.play.song_id,
        name: output.play.song_name,
        artist: output.play.artist,
        url: songInfo?.url || null,
      },
      reason: output.reason,
      segue: output.segue,
    });
  } catch (err: any) {
    console.error('/api/chat error:', err);
    res.status(500).json({ error: err.message || '处理请求时出错' });
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run pages/api/__tests__/chat.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add pages/api/chat.ts pages/api/__tests__/chat.test.ts
git commit -m "feat: add POST /api/chat core recommendation endpoint"
```

---

## Phase 4: 前端界面

**Goal:** 完整可用的 Web 播放器，用户能输入推荐请求、看到结果、播放音乐。

> **并行策略：** Task 4.1 (Player)、4.2 (ChatInput + NowPlaying)、4.3 (History) 可分 3 个 agent。Task 4.4 (主页面整合) 依赖前面全部完成。

---

### Task 4.1: components/Player.tsx — 音频播放器

**Files:**
- Create: `components/Player.tsx`
- Create: `components/__tests__/Player.test.tsx`

- [ ] **Step 1: 写失败测试**

```typescript
// components/__tests__/Player.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Player } from '../Player';

describe('Player', () => {
  it('renders play button when no song is loaded', () => {
    render(<Player songUrl={null} songName="" artist="" reason="" segue="" />);
    expect(screen.getByText('等待播放')).toBeDefined();
  });

  it('renders song info when song is loaded', () => {
    render(<Player songUrl="https://example.com/song.mp3" songName="晴天" artist="周杰伦" reason="经典好歌" segue="" />);
    expect(screen.getByText('晴天')).toBeDefined();
    expect(screen.getByText('周杰伦')).toBeDefined();
    expect(screen.getByText('经典好歌')).toBeDefined();
  });

  it('renders audio element when url is provided', () => {
    const { container } = render(<Player songUrl="https://example.com/song.mp3" songName="晴天" artist="周杰伦" reason="" segue="" />);
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run components/__tests__/Player.test.tsx
```

- [ ] **Step 3: 实现 Player 组件**

```typescript
// components/Player.tsx
import { useRef, useEffect, useState } from 'react';

interface PlayerProps {
  songUrl: string | null;
  songName: string;
  artist: string;
  reason: string;
  segue: string;
}

export function Player({ songUrl, songName, artist, reason, segue }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (songUrl && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setError('播放失败，请尝试手动播放');
      });
    }
  }, [songUrl]);

  if (!songUrl) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        <div className="text-4xl mb-2">♪</div>
        <p>等待播放</p>
        <p className="text-sm mt-1">输入你想听的音乐，Claudio 为你推荐</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <audio ref={audioRef} controls className="w-full mb-4" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}>
        <source src={songUrl} type="audio/mpeg" />
      </audio>

      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">{songName}</h2>
        <p className="text-gray-400">{artist}</p>
      </div>

      {reason && <p className="text-purple-400 text-sm mb-1">推荐理由：{reason}</p>}
      {segue && <p className="text-gray-500 text-sm italic">{segue}</p>}
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run components/__tests__/Player.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/Player.tsx components/__tests__/Player.test.tsx
git commit -m "feat: implement audio player component"
```

---

### Task 4.2: components/ChatInput.tsx + components/NowPlaying.tsx

**Files:**
- Create: `components/ChatInput.tsx`, `components/NowPlaying.tsx`
- Create: `components/__tests__/ChatInput.test.tsx`, `components/__tests__/NowPlaying.test.tsx`

- [ ] **Step 1: 写失败测试**

```typescript
// components/__tests__/ChatInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('renders input and submit button', () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText(/推荐/)).toBeDefined();
    expect(screen.getByText('推荐')).toBeDefined();
  });

  it('calls onSubmit with input value', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText(/推荐/);
    fireEvent.change(input, { target: { value: '推荐一首歌' } });
    fireEvent.click(screen.getByText('推荐'));
    expect(onSubmit).toHaveBeenCalledWith('推荐一首歌');
  });

  it('disables button while loading', () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={true} />);
    const btn = screen.getByText('思考中...');
    expect(btn).toBeDefined();
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('clears input after submit', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText(/推荐/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '推荐一首歌' } });
    fireEvent.click(screen.getByText('推荐'));
    expect(input.value).toBe('');
  });
});
```

```typescript
// components/__tests__/NowPlaying.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NowPlaying } from '../NowPlaying';

describe('NowPlaying', () => {
  it('shows empty state when no song', () => {
    render(<NowPlaying songName="" artist="" reason="" segue="" />);
    expect(screen.getByText('暂无播放')).toBeDefined();
  });

  it('shows song info when provided', () => {
    render(<NowPlaying songName="晴天" artist="周杰伦" reason="推荐理由" segue="下一首..." />);
    expect(screen.getByText('晴天')).toBeDefined();
    expect(screen.getByText('周杰伦')).toBeDefined();
    expect(screen.getByText(/推荐理由/)).toBeDefined();
    expect(screen.getByText(/下一首/)).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run components/__tests__/ChatInput.test.tsx components/__tests__/NowPlaying.test.tsx
```

- [ ] **Step 3: 实现两个组件**

```typescript
// components/ChatInput.tsx
import { useState, FormEvent } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入推荐请求，如「推荐一首适合现在听的歌」"
        className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg px-6 py-2 font-medium transition"
      >
        {isLoading ? '思考中...' : '推荐'}
      </button>
    </form>
  );
}
```

```typescript
// components/NowPlaying.tsx
interface NowPlayingProps {
  songName: string;
  artist: string;
  reason: string;
  segue: string;
}

export function NowPlaying({ songName, artist, reason, segue }: NowPlayingProps) {
  if (!songName) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500">
        <p>暂无播放</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white">{songName}</h2>
      <p className="text-gray-400 mb-2">{artist}</p>
      {reason && <p className="text-purple-400 text-sm">推荐理由：{reason}</p>}
      {segue && <p className="text-gray-500 text-sm italic mt-1">{segue}</p>}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run components/__tests__/ChatInput.test.tsx components/__tests__/NowPlaying.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/ChatInput.tsx components/NowPlaying.tsx components/__tests__/ChatInput.test.tsx components/__tests__/NowPlaying.test.tsx
git commit -m "feat: implement ChatInput and NowPlaying components"
```

---

### Task 4.3: components/History.tsx

**Files:**
- Create: `components/History.tsx`
- Create: `components/__tests__/History.test.tsx`

- [ ] **Step 1: 写失败测试**

```typescript
// components/__tests__/History.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { History } from '../History';

const mockPlays = [
  { time: '2026-05-30T10:00:00Z', song_name: '晴天', artist: '周杰伦', skipped: false },
  { time: '2026-05-30T09:00:00Z', song_name: '七里香', artist: '周杰伦', skipped: true },
];

describe('History', () => {
  it('renders empty state when no plays', () => {
    render(<History plays={[]} />);
    expect(screen.getByText('暂无播放历史')).toBeDefined();
  });

  it('renders play list', () => {
    render(<History plays={mockPlays} />);
    expect(screen.getByText('晴天')).toBeDefined();
    expect(screen.getByText('七里香')).toBeDefined();
  });

  it('marks skipped songs', () => {
    render(<History plays={mockPlays} />);
    expect(screen.getByText('已跳过')).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run components/__tests__/History.test.tsx
```

- [ ] **Step 3: 实现 History 组件**

```typescript
// components/History.tsx
interface PlayRecord {
  time: string;
  song_name: string;
  artist: string;
  skipped: boolean;
}

interface HistoryProps {
  plays: PlayRecord[];
}

export function History({ plays }: HistoryProps) {
  if (plays.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-3">播放历史</h3>
        <p className="text-gray-500 text-center">暂无播放历史</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-bold text-white mb-3">播放历史</h3>
      <ul className="space-y-2">
        {plays.map((p, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <div>
              <span className="text-white">{p.song_name}</span>
              <span className="text-gray-400 ml-2">{p.artist}</span>
            </div>
            <span className={p.skipped ? 'text-yellow-500' : 'text-green-500'}>
              {p.skipped ? '已跳过' : '已播放'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run components/__tests__/History.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/History.tsx components/__tests__/History.test.tsx
git commit -m "feat: implement play history component"
```

---

### Task 4.4: pages/index.tsx — 主页面整合

**Files:**
- Modify: `pages/index.tsx`
- Modify: `pages/_app.tsx`

- [ ] **Step 1: 写失败测试**

```typescript
// pages/__tests__/index.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../index';

describe('Home page', () => {
  it('renders main title', () => {
    render(<Home />);
    expect(screen.getByText('Claudio')).toBeDefined();
  });

  it('renders ChatInput', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/推荐/)).toBeDefined();
  });

  it('renders Player area', () => {
    render(<Home />);
    expect(screen.getByText('等待播放')).toBeDefined();
  });

  it('renders History area', () => {
    render(<Home />);
    expect(screen.getByText('播放历史')).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run pages/__tests__/index.test.tsx
```

- [ ] **Step 3: 实现主页面**

```typescript
// pages/index.tsx
import { useState, useCallback } from 'react';
import Head from 'next/head';
import { Player } from '@/components/Player';
import { ChatInput } from '@/components/ChatInput';
import { NowPlaying } from '@/components/NowPlaying';
import { History } from '@/components/History';

interface SongData {
  name: string;
  artist: string;
  url: string | null;
  reason: string;
  segue: string;
}

interface PlayRecord {
  time: string;
  song_name: string;
  artist: string;
  skipped: boolean;
}

export default function Home() {
  const [song, setSong] = useState<SongData>({ name: '', artist: '', url: null, reason: '', segue: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PlayRecord[]>([]);

  const handleSubmit = useCallback(async (message: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '请求失败');
        return;
      }
      if (data.type === 'CONTROL' || data.type === 'SEARCH') {
        setError(`暂不支持「${message}」，请尝试自然语言推荐`);
        return;
      }
      setSong({
        name: data.play.name,
        artist: data.play.artist,
        url: data.play.url,
        reason: data.reason,
        segue: data.segue,
      });
      setHistory((prev) => [
        { time: new Date().toISOString(), song_name: data.play.name, artist: data.play.artist, skipped: false },
        ...prev,
      ]);
    } catch (e: any) {
      setError(e.message || '网络请求失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Claudio - 个人 AI 电台</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-center mb-8">
            <span className="text-purple-400">Claudio</span> 个人 AI 电台
          </h1>

          <div className="mb-6">
            <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <div className="mb-6">
            <Player
              songUrl={song.url}
              songName={song.name}
              artist={song.artist}
              reason={song.reason}
              segue={song.segue}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NowPlaying songName={song.name} artist={song.artist} reason={song.reason} segue={song.segue} />
            <History plays={history} />
          </div>
        </div>
      </main>
    </>
  );
}
```

```typescript
// pages/_app.tsx
import type { AppProps } from 'next/app';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

- [ ] **Step 4: 确保 globals.css 引入 Tailwind**

```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-900;
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run pages/__tests__/index.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add pages/index.tsx pages/_app.tsx styles/globals.css pages/__tests__/index.test.tsx
git commit -m "feat: integrate main page with player, chat, and history"
```

---

## Phase 5: 集成验证

**Goal:** 端到端链路跑通，系统可用于手工验收。

- [ ] **Step 1: 启动 NeteaseCloudMusicApi**

```bash
# 在新的终端窗口
git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git /tmp/netease-api
cd /tmp/netease-api
npm install
node app.js
# 确认运行在 http://localhost:3000
```

- [ ] **Step 2: 启动 Next.js 开发服务器**

```bash
cd E:\work\cc-music
npm run dev
```

- [ ] **Step 3: 验证健康检查**

```bash
curl http://localhost:3000/api/now
# Expected: {"current":null,"history":[]}
```

- [ ] **Step 4: 验证 /api/chat（需要 Claude CLI 可用）**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"推荐一首适合现在听的歌"}'
# Expected: 包含 say/play/reason/segue 的 JSON 响应
```

- [ ] **Step 5: 浏览器手工验收**

打开 http://localhost:3000，验证：
- 页面正常渲染，标题可见
- 输入框可用
- 输入推荐请求后得到结果
- 播放器正常播放
- 历史记录更新

- [ ] **Step 6: 运行全部测试**

```bash
npm test
```

Expected: 全部测试 PASS。

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete personal AI radio MVP"
```

---

## 总结

| 阶段 | 任务数 | 可并行 | 预估时间 |
|------|--------|--------|----------|
| P1 基础设施 | 2 | 否 | 10min |
| P2 数据层 | 6 | 5 agent 并行 | 15min |
| P3 API 层 | 3 | 3 agent 并行 | 10min |
| P4 前端界面 | 4 | 3 agent 并行（+1 串行） | 15min |
| P5 集成验证 | 1 | 否 | 15min |
| **总计** | **16** | — | **约 65min** |
