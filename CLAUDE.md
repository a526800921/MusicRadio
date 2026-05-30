# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Claudio — a local AI radio DJ. Natural language music recommendations via Claude Code CLI, Netease Cloud Music as the song source, Next.js web player. Inspired by mmguo's Claudio architecture (see `Claudio技术架构详解.md`).

## Commands

```bash
npm run dev          # Start dev server (webpack mode — Turbopack broken on Windows)
npm test             # Run all 94 tests (vitest run)
npm test -- lib/     # Run tests in a directory
npm test -- -t "test name"  # Run tests matching pattern
npm run build        # Production build
```

## Architecture

Four-layer pipeline, inspired by Claudio:

```
User taste files (user/*.md) + Claude CLI + Netease API
          ↓
ROUTER → CONTEXT → CLAUDE → STATE   (lib/)
          ↓
Claude reasoning → {say, play, reason, segue}
          ↓
Next.js PWA (pages/ + components/)
```

### Core pipeline (POST /api/chat)

1. **ROUTER** (`lib/router.ts`) — classifies intent: CONTROL / SEARCH / AI
2. **CONTEXT** (`lib/context.ts`) — assembles system prompt from user taste files + play history + time of day
3. **CLAUDE** (`lib/claude.ts`) — spawns `bash -c "claude -p < promptfile"`, parses JSON output. Retries once on parse failure. Bash path auto-detected on Windows (Git install dirs).
4. **SEARCH** — takes Claude's `{song_name, artist}`, searches Netease for the real song ID, tries to find a playable URL
5. **STATE** (`lib/state.ts`) — persists plays/messages to `data/state.json`

### Other lib modules

- `lib/scheduler.ts` — detects time of day (早上/下午/晚上/深夜) for context injection
- `lib/netease.ts` — wraps NeteaseCloudMusicApi npm package. Tries quality levels `lossless → exhigh → higher → standard`. Supports cookie via `NETEASE_COOKIE` env var or `data/netease-cookie.txt`

### API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Core recommendation pipeline |
| `/api/now` | GET | Current playback state |
| `/api/search?q=` | GET | Song search |
| `/api/taste` | GET | User taste data |
| `/api/history` | GET | Play history |

### Frontend

- `pages/index.tsx` — main page: ChatInput, Player, NowPlaying, History
- `components/Player.tsx` — HTML5 audio player with `onEnded` callback for auto-next
- On mount: loads history from `/api/history` (persisted)
- After song starts: preloads next recommendation in background
- Preloaded song shows "立即播放" skip button

## Environment variables (.env.local)

```
CLAUDE_MODEL=haiku            # Claude model (haiku/sonnet/opus)
NETEASE_COOKIE=MUSIC_U=...    # Netease login cookie for full-quality audio
```

## Windows-specific issues

**Turbopack:** Turbopack spawns Node worker processes for CSS, which fail with exit code `0xc0000142` (DLL init failure). `package.json` dev script uses `--webpack` to avoid this.

**Claude CLI spawn:** `spawn('claude')` fails with same DLL error. Using `spawn('bash', ['-c', 'claude -p < file'])` as workaround. Bash path auto-detection searches common Git install locations, falls back to PATH.

**File locking:** Rapid writes to `data/state.json` can lose data on Windows. Tests avoid this by keeping write counts low. Production is fine (one write per song).

## User taste files (live-reload — no restart needed)

- `user/taste.md` — favorite artists, genres, blacklist
- `user/routines.md` — time-of-day music preferences
- `user/mood-rules.md` — mood → BPM/style mappings
- `user/playlists.json` — custom playlists (not yet used by UI)
- `prompt/persona.md` — Claude's DJ personality and JSON output format

Tip: use the blacklist section in `user/taste.md` for artists with no Netease streaming rights (e.g., 周杰伦).

## Testing

- Vitest with jsdom environment
- `node-mocks-http` for API route testing
- `@testing-library/react` for component tests
- Tests follow TDD pattern: write failing test → implement → verify pass → commit
