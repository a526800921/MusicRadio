# Claudio 个人 AI 电台 — 项目开发日志

> 2026-05-30 至 2026-05-31，49 个 commit，111 个测试用例

## 项目起源

基于 mmguo 的 Claudio 技术架构（`Claudio技术架构详解.md`），目标是做一个本地运行的 AI 电台 DJ：自然语言输入 → Claude 推理推荐歌曲 → 网易云音乐播放 → DJ 语音播报。

核心技术选型：
- **框架**：Next.js Pages Router + TypeScript + Tailwind CSS
- **AI 大脑**：Claude Code CLI 子进程调用
- **音乐源**：NeteaseCloudMusicApi npm 包
- **TTS 播报**：Windows SAPI（System.Speech）
- **测试**：Vitest + jsdom + node-mocks-http + @testing-library/react

---

## 开发过程

### Phase 1：项目基础设施 (2 commits)

- 初始化 Next.js + TypeScript + Tailwind + Vitest
- 创建用户品味文件（`user/`）和 Claude 角色设定（`prompt/persona.md`）
- 初始化播放状态数据文件（`data/state.json`）

### Phase 2：数据层 — 6 个核心模块 (6 commits)

| 模块 | 文件 | 职责 |
|------|------|------|
| STATE | `lib/state.ts` | JSON 文件持久化（plays/messages/prefs） |
| SCHEDULER | `lib/scheduler.ts` | 时段检测（早上/下午/晚上/深夜） |
| NETEASE | `lib/netease.ts` | 网易云 API 封装（搜索/播放链接/歌词） |
| CLAUDE | `lib/claude.ts` | Claude CLI 子进程调用 + JSON 解析 + 重试 |
| ROUTER | `lib/router.ts` | 意图分类（CONTROL/SEARCH/AI） |
| CONTEXT | `lib/context.ts` | 碎片组装 → system prompt |

5 个独立模块并行开发（多 agent），context 模块串行。

### Phase 3：API 层 — 5 个 REST 端点 (3 commits)

| 端点 | 用途 |
|------|------|
| `GET /api/now` | 当前播放状态 |
| `GET /api/search` | 歌曲搜索 |
| `GET /api/taste` | 用户品味数据 |
| `GET /api/history` | 播放历史 |
| `POST /api/chat` | 核心推荐链路 |

### Phase 4：前端界面 — 4 个组件 + 主页面 (5 commits)

- `Player.tsx`：HTML5 音频播放器
- `ChatInput.tsx`：推荐输入框
- `NowPlaying.tsx`：当前歌曲信息
- `History.tsx`：播放历史列表
- `pages/index.tsx`：主页面整合

### Phase 5：Windows 踩坑修复 (7 commits)

| 问题 | 根因 | 解决方案 |
|------|------|----------|
| `spawn('claude')` 进程崩溃 | DLL 初始化失败 `0xc0000142` | 通过 Git Bash 桥接：`spawn('bash', ...)` |
| 中文编码乱码 | cmd.exe 不兼容中文 | 写临时文件 + `<` 重定向 |
| Turbopack CSS 编译失败 | 同 DLL 问题 | `--webpack` 替代 Turbopack |
| bash 路径未找到 | Windows 原生终端 PATH 无 bash | 自动搜索 Git 安装目录 |
| `cat` 命令未找到 | Git Bash 精简环境 | 改用 shell 内建重定向 |
| 测试数据丢失 | Windows 文件锁 | 批量写入 + 减少单测写入量 |
| PS 脚本路径反斜杠转义 | spawn 传参时 `\` 被消费 | 改用正斜杠 |

### Phase 6：功能增强 (8 commits)

- **自动播放下一首**：`onEnded` 回调 + 预加载机制
- **预加载**：歌曲开始播放时后台调 Claude 拿下一首，"立即播放"按钮可跳过
- **无播放链接跳过**：遇 null URL 自动重试最多 3 次换歌
- **模型切换**：`--model` 参数支持，默认 haiku
- **网易云 cookie**：支持 SVIP 无损音质（lossless→exhigh→higher→standard 逐级尝试）
- **黑名单**：周杰伦（网易云无版权）
- **Console 日志**：全链路关键步骤可视化

### Phase 7：TTS DJ 语音播报 (7 commits)

- Edge TTS npm 包 → TypeScript 编译失败
- 直接调 HTTPS API → 404
- WebSocket 协议 → 403 Forbidden
- Windows SAPI 本地合成 → 成功
- Base64 EncodedCommand → 编码问题
- PowerShell `-File` + 临时脚本 → 最终方案

**最终方案**：纯本地 Windows 语音引擎（Microsoft Huihui 慧慧），零网络，零 API Key。歌曲播放 0.8 秒后 DJ 开始说话，歌曲音量自动降到 30%，播完恢复。

---

## 关键架构决策

### Claude 调用方式

不用 Claude API SDK，而是通过 CLI 子进程 `claude -p`，原因：
- 复用 Claude Code 已有的认证和上下文管理
- 用户本地已有 Claude Code 安装

### 歌曲匹配流程

```
Claude 推荐歌名+艺人 → 网易云搜索 → 取真实 ID → 获取播放链接
```

不信任 Claude 编造的 song_id，始终通过搜索验证。

### Cookie 格式

`NETEASE_COOKIE` 需要 `MUSIC_U=xxx` 的 key=value 格式。自动检测缺少 `=` 时自动补 `MUSIC_U=` 前缀。

### TTS 缓存

按文本 MD5 hash 缓存音频文件到 `cache/tts/`，相同文案不重复合成。`/api/tts/{hash}` 端点设置 `Cache-Control: immutable` 永久缓存。

---

## 项目统计

| 指标 | 数值 |
|------|------|
| 总 commit | 49 |
| 源码文件 | 26 |
| 测试文件 | 18 |
| 测试用例 | 111 |
| 测试通过率 | 111/111 |

### 测试覆盖分布

| 模块 | 用例数 |
|------|--------|
| `lib/router.ts` | 16 |
| `lib/tts.ts` | 10 |
| `components/Player.tsx` | 10 |
| `lib/claude.ts` | 8 |
| `lib/context.ts` | 7 |
| `lib/scheduler.ts` | 7 |
| `pages/api/chat.ts` | 7 |
| `lib/state.ts` | 6 |
| `components/History.tsx` | 6 |
| `lib/netease.ts` | 5 |
| `components/ChatInput.tsx` | 5 |
| `pages/index.tsx` | 5 |
| `/api/tts/[hash]` | 5 |
| `components/NowPlaying.tsx` | 4 |
| `pages/api/now.ts` | 3 |
| `pages/api/search.ts` | 3 |
| `pages/api/taste.ts` | 2 |
| `pages/api/history.ts` | 2 |

---

## 启动方式

```bash
cd cc-music
cp .env .env.local    # 填入你的 NETEASE_COOKIE
npm install
npm run dev            # http://localhost:3000
npm test               # 111 tests
```
