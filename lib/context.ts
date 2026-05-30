import fs from 'fs';
import path from 'path';
import { getRecentPlays } from './state';
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
