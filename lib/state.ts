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

function defaultState(): AppState {
  return {
    plays: [],
    messages: [],
    prefs: { favorite_genres: [], favorite_artists: [] },
  };
}

export function readState(): AppState {
  try {
    if (!fs.existsSync(STATE_PATH)) return defaultState();
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

export function writeState(state: AppState): void {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = JSON.stringify(state, null, 2);
  // Retry up to 3 times for transient Windows file-locking errors
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.writeFileSync(STATE_PATH, data, 'utf-8');
      return;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
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
