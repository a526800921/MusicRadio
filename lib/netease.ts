import {
  cloudsearch,
  song_url_v1,
  lyric,
} from 'NeteaseCloudMusicApi';

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
    const result = await cloudsearch({ keywords: keyword, limit });
    return formatSearchResult(result.body);
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
    const result = await song_url_v1({ id: songId, level: 'standard' });
    return result?.body?.data?.[0]?.url || null;
  } catch {
    return null;
  }
}

export async function getSongUrlWithInfo(
  songId: string,
  name: string,
  artist: string
): Promise<SongUrlInfo | null> {
  const url = await getSongUrl(songId);
  if (!url) return null;
  return { id: songId, url, name, artist };
}

export async function getLyric(songId: string): Promise<string | null> {
  try {
    const result = await lyric({ id: songId });
    return result?.body?.lrc?.lyric || result?.lrc?.lyric || null;
  } catch {
    return null;
  }
}
