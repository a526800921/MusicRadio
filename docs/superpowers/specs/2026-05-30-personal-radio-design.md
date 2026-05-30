# 个人 AI 电台设计文档

> 基于 Claudio 技术架构，构建个人 AI 电台 · 2026-05-30

## 概述

借鉴 mmguo 的 Claudio 四层架构，复刻一个本地运行的 AI 电台系统。用户用自然语言请求推荐，Claude 作为 AI 大脑理解意图并推荐歌曲，通过网易云音乐 API 获取播放链接，在 Web 界面播放并展示推荐理由。

与 Claudio 原版的核心差异：去掉 TTS 语音播报（预留接口）、去掉日历/天气联动、调度器从主动推送降为场景感知。

## 架构总览

四层结构：

```
第一层 — 外部上下文
  USER/ (taste.md · routines.md · playlists.json · mood-rules.md)
  BRAIN (Claude Code CLI 子进程)
  MUSIC (NeteaseCloudMusicApi · 搜索/播放链接/歌词)

第二层 — 本地大脑
  ROUTER → CONTEXT → CLAUDE → SCHEDULER → STATE
  意图分发  提示词组装  AI适配器   场景感知    持久化

第三层 — 运行时聚合
  碎片 ①~⑤ → Context Window → 模型推理 → {say, play, reason, segue}

第四层 — 交互界面
  Next.js App (localhost:3000)
  播放器 / 聊天输入 / 播放历史
```

## 核心模块

### ROUTER — 意图分发

三类请求，三条路径：

1. **播放控制**（播放/暂停/下一首/音量）→ 直接执行，不走 AI
2. **音乐搜索**（"搜周杰伦的晴天"）→ 调网易云 API
3. **自然语言推荐**（"推荐一首适合现在听的歌"）→ 走完整链路

### CONTEXT — 提示词组装

读取以下内容，拼接为一个完整 system prompt：

- `user/taste.md` — 音乐品味
- `user/routines.md` — 作息规律
- `user/playlists.json` — 自定义歌单
- `user/mood-rules.md` — 情绪-音乐映射
- `data/state.json` — 播放历史、偏好变化
- SCHEDULER 提供的当前时段标签

### CLAUDE — AI 适配器

通过 `child_process.spawn` 调用 Claude Code CLI：

```bash
claude -p "<system_prompt>" > output.json
```

解析 JSON 输出：

```json
{
  "say": "DJ 播报文案（预留 TTS）",
  "play": { "song_id": "xxx", "song_name": "歌名", "artist": "艺人" },
  "reason": "推荐理由",
  "segue": "转场衔接语"
}
```

### SCHEDULER — 场景感知

被动模式，不做定时主动推送：

- 用户打开页面或触发推荐时，检测当前时段（早上/下午/晚上/深夜）
- 作为上下文标签注入 system prompt（如 `当前时段：深夜`）

### STATE — 持久化

读写 `data/state.json`，存储结构：

```json
{
  "plays": [{ "time": "ISO8601", "song_id": "xxx", "song_name": "...", "skipped": false }],
  "messages": [{ "role": "user/assistant", "content": "...", "time": "ISO8601" }],
  "prefs": { "favorite_genres": [], "favorite_artists": [] }
}
```

## API 设计

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/now` | GET | 当前播放状态 |
| `/api/chat` | POST | 自然语言推荐（核心端点） |
| `/api/search` | GET | 歌曲搜索 |
| `/api/taste` | GET | 用户品味数据 |
| `/api/history` | GET | 播放历史 |

### POST /api/chat

```
请求: { "message": "推荐一首适合现在听的歌" }

内部流程:
1. ROUTER 判断意图 → AI 路径
2. CONTEXT 读取品味/历史/时段 → 组装 prompt
3. CLAUDE spawn → 解析 {say, play, reason, segue}
4. play.song_id → 网易云获取播放链接
5. 写入 state.json

响应:
{
  "say": "...",
  "play": { "id": "xxx", "name": "歌名", "artist": "艺人", "url": "播放链接" },
  "reason": "推荐理由",
  "segue": "转场语"
}
```

## 技术栈

- **框架**：Next.js (Pages Router) + TypeScript
- **样式**：Tailwind CSS
- **AI 调用**：Node.js `child_process.spawn` 调 Claude Code CLI
- **音乐源**：NeteaseCloudMusicApi
- **持久化**：JSON 文件（`data/state.json`）
- **用户品味**：手写 Markdown 文件（`user/*.md`）

## 项目结构

```
cc-music/
├── user/
│   ├── taste.md
│   ├── routines.md
│   ├── playlists.json
│   └── mood-rules.md
├── prompt/
│   └── persona.md
├── data/
│   └── state.json
├── pages/
│   ├── index.tsx
│   ├── api/
│   │   ├── now.ts
│   │   ├── chat.ts
│   │   ├── search.ts
│   │   ├── taste.ts
│   │   └── history.ts
│   └── _app.tsx
├── lib/
│   ├── router.ts
│   ├── context.ts
│   ├── claude.ts
│   ├── scheduler.ts
│   ├── state.ts
│   └── netease.ts
├── components/
│   ├── Player.tsx
│   ├── ChatInput.tsx
│   ├── NowPlaying.tsx
│   └── History.tsx
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

## 可行性评估

### 已验证可行的点

- **Claude Code CLI 子进程调用**：`claude -p` 已稳定支持，输出可管道捕获
- **NeteaseCloudMusicApi**：开源项目，search/song_url/lyric 端点成熟
- **Next.js 全栈**：成熟框架
- **JSON 文件持久化**：数据量小，完全够用

### 风险点

| 风险 | 影响 | 缓解 |
|------|------|------|
| 网易云 API 不稳定 | 播放链接可能失效 | 预留多源切换接口 |
| Claude CLI 响应慢 | 推荐等待时间长 | 前端 loading 状态 + 流式展示文案 |
| 模型非 Claude | 输出格式可能不严格 JSON | CONTEXT 中强化格式要求，lib/claude.ts 做容错解析 |
| Windows 子进程兼容 | spawn 路径/编码问题 | 通配 shell 模式，UTF-8 强制设置 |

### 结论

**可行。** 核心链路（用户输入 → CONTEXT 组装 → Claude 推理 → 网易云播放 → Web 展示）技术成熟，依赖项少，预计可在一个会话内跑通 MVP。
