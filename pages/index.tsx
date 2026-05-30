import { useState, useCallback, useEffect, useRef } from 'react';
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

const emptySong: SongData = { name: '', artist: '', url: null, reason: '', segue: '' };

export default function Home() {
  const [song, setSong] = useState<SongData>(emptySong);
  const [isLoading, setIsLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [preloadReady, setPreloadReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PlayRecord[]>([]);
  const preloadedRef = useRef<SongData | null>(null);
  const preloadingRef = useRef(false);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((data) => setHistory(data.plays || []))
      .catch(() => {});
  }, []);

  const fetchSong = useCallback(async (message: string): Promise<SongData | null> => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok || data.type === 'CONTROL' || data.type === 'SEARCH') return null;
      return {
        name: data.play.name,
        artist: data.play.artist,
        url: data.play.url,
        reason: data.reason,
        segue: data.segue,
      };
    } catch {
      return null;
    }
  }, []);

  const addToHistory = useCallback((s: SongData) => {
    setHistory((prev) => [
      { time: new Date().toISOString(), song_name: s.name, artist: s.artist, skipped: false },
      ...prev,
    ]);
  }, []);

  const preloadNext = useCallback(async () => {
    if (preloadingRef.current) return;
    preloadingRef.current = true;
    setPreloadReady(false);

    let next = await fetchSong('再来一首，风格跟前一首类似或者互补');

    // Retry if no playable URL
    let retries = 0;
    while (next && !next.url && retries < 3) {
      retries++;
      console.log(`[PRELOAD] 无播放链接，重试预加载第 ${retries} 次...`);
      next = await fetchSong('换一首，跟前一首风格类似或者互补');
    }

    if (next) {
      preloadedRef.current = next;
      setPreloadReady(true);
    }
    preloadingRef.current = false;
  }, [fetchSong]);

  const playSong = useCallback(async (message: string, isAuto: boolean) => {
    if (isAuto) setAutoLoading(true); else setIsLoading(true);
    setError(null);

    let result = await fetchSong(message);
    if (!result) {
      setError('推荐失败，请重试');
      setIsLoading(false);
      setAutoLoading(false);
      return;
    }

    // If no playable URL, retry up to 3 times
    let retries = 0;
    while (!result.url && retries < 3) {
      retries++;
      console.log(`[PRELOAD] 无播放链接，重试第 ${retries} 次...`);
      const next = await fetchSong('换一首，风格跟前一首类似或者互补');
      if (next) result = next;
    }

    setSong(result);
    addToHistory(result);
    setIsLoading(false);
    setAutoLoading(false);

    // Preload next song in background (also retries on null URL)
    preloadedRef.current = null;
    setPreloadReady(false);
    preloadNext();
  }, [fetchSong, addToHistory, preloadNext]);

  const requestSong = useCallback((message: string, isAuto: boolean) => {
    playSong(message, isAuto);
  }, [playSong]);

  const handleSubmit = useCallback((message: string) => {
    requestSong(message, false);
  }, [requestSong]);

  const playPreloaded = useCallback(async () => {
    if (!preloadedRef.current) return;
    let next = preloadedRef.current;
    preloadedRef.current = null;
    setPreloadReady(false);

    let retries = 0;
    while (!next.url && retries < 2) {
      retries++;
      const fresh = await fetchSong('换一首，跟前一首风格类似或者互补');
      if (fresh) next = fresh;
    }

    setSong(next);
    addToHistory(next);
    preloadNext();
  }, [addToHistory, fetchSong, preloadNext]);

  const handleEnded = useCallback(async () => {
    if (preloadedRef.current) {
      playPreloaded();
    } else {
      playSong('再来一首，风格跟前一首类似或者互补', true);
    }
  }, [playSong, playPreloaded]);

  return (
    <>
      <Head>
        <title>Claudio - 个人 AI 电台</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <h1 className="text-3xl font-bold text-center mb-8">
            <span className="text-purple-400">Claudio</span> 个人 AI 电台
          </h1>

          {/* Input */}
          <div className="mb-6">
            <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Player */}
          <div className="mb-6">
            <Player
              songUrl={song.url}
              songName={song.name}
              artist={song.artist}
              reason={song.reason}
              segue={song.segue}
              onEnded={handleEnded}
              isLoading={autoLoading}
            />
            {preloadReady && preloadedRef.current && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <p className="text-green-400 text-xs">
                  下一首已就绪：{preloadedRef.current.name} - {preloadedRef.current.artist}
                </p>
                <button
                  onClick={playPreloaded}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 transition"
                >
                  立即播放
                </button>
              </div>
            )}
          </div>

          {/* Info panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NowPlaying
              songName={song.name}
              artist={song.artist}
              reason={song.reason}
              segue={song.segue}
            />
            <History plays={history} />
          </div>
        </div>
      </main>
    </>
  );
}
