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
    const res = await fetch(
      `${NETEASE_BASE}/search?keywords=${encodeURIComponent(keyword)}&limit=${limit}`
    );
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
    const res = await fetch(`${NETEASE_BASE}/lyric?id=${songId}`);
    const data = await res.json();
    return data?.lrc?.lyric || null;
  } catch {
    return null;
  }
}
