import { useState, useCallback, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PlayRecord[]>([]);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((data) => setHistory(data.plays || []))
      .catch(() => {});
  }, []);

  const requestSong = useCallback(async (message: string, isAuto: boolean) => {
    if (isAuto) {
      setAutoLoading(true);
    } else {
      setIsLoading(true);
    }
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

      if (data.type === 'CONTROL') {
        setError('播放控制功能即将推出');
        return;
      }
      if (data.type === 'SEARCH') {
        setError(`搜索「${data.keyword}」功能即将推出`);
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
        {
          time: new Date().toISOString(),
          song_name: data.play.name,
          artist: data.play.artist,
          skipped: false,
        },
        ...prev,
      ]);
    } catch (e: any) {
      setError(e.message || '网络请求失败');
    } finally {
      setIsLoading(false);
      setAutoLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((message: string) => {
    requestSong(message, false);
  }, [requestSong]);

  const handleEnded = useCallback(() => {
    requestSong('再来一首，风格跟前一首类似或者互补', true);
  }, [requestSong]);

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
