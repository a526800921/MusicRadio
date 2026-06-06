import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { readState, writeState, addPlay, addMessage, getRecentPlays, getRecentMessages } from '../state';

describe('state', () => {
  const statePath = path.join(process.cwd(), 'data', 'state.json');
  let originalContent = '';

  beforeEach(() => {
    // Backup original state.json if exists
    if (fs.existsSync(statePath)) {
      originalContent = fs.readFileSync(statePath, 'utf-8');
    }
    // Clean state for testing
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
  });

  afterEach(() => {
    // Restore
    if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
    if (originalContent) {
      fs.writeFileSync(statePath, originalContent);
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
      const testState = {
        plays: [{ time: '2026-01-01T00:00:00Z', song_id: '123', song_name: 'Test', artist: 'Test', skipped: false }],
        messages: [],
        prefs: { favorite_genres: [], favorite_artists: [] }
      };
      writeState(testState);
      const state = readState();
      expect(state.plays).toHaveLength(1);
      expect(state.plays[0].song_id).toBe('123');
    });
  });

  describe('addPlay', () => {
    it('adds a play record and persists', () => {
      const result = addPlay({
        time: '2026-01-01T00:00:00Z',
        song_id: '456',
        song_name: 'Song',
        artist: 'Artist',
        skipped: false,
      });
      expect(result.plays).toHaveLength(1);
      expect(result.plays[0].song_id).toBe('456');

      const persisted = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(persisted.plays).toHaveLength(1);
    });
  });

  describe('addMessage', () => {
    it('adds a message and persists', () => {
      const result = addMessage({
        role: 'user',
        content: '推荐一首歌',
        time: '2026-01-01T00:00:00Z',
      });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('推荐一首歌');
    });
  });

  describe('getRecentPlays', () => {
    it('returns plays in reverse order limited by count', () => {
      // Batch write to avoid Windows file lock contention
      const state = readState();
      for (let i = 0; i < 15; i++) {
        state.plays.push({ time: `2026-01-${String(i+1).padStart(2,'0')}T00:00:00Z`, song_id: String(i), song_name: `Song${i}`, artist: 'Artist', skipped: false });
      }
      writeState(state);

      const recent = getRecentPlays(5);
      expect(recent).toHaveLength(5);
      expect(recent[0].song_id).toBe('14');
    });
  });

  describe('getRecentMessages', () => {
    it('returns recent messages', () => {
      // Batch write to avoid Windows file lock contention
      const state = readState();
      for (let i = 0; i < 15; i++) {
        state.messages.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Msg${i}`, time: `2026-01-01T00:${String(i).padStart(2,'0')}00Z` });
      }
      writeState(state);

      const recent = getRecentMessages(10);
      expect(recent).toHaveLength(10);
    });
  });
});
