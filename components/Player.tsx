import { useRef, useEffect, useState } from 'react';

interface PlayerProps {
  songUrl: string | null;
  songName: string;
  artist: string;
  reason: string;
  segue: string;
  ttsUrl?: string | null;
  onEnded?: () => void;
  isLoading?: boolean;
}

export function Player({ songUrl, songName, artist, reason, segue, ttsUrl, onEnded, isLoading }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const voiceRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);

  useEffect(() => {
    setError(null);
    if (!songUrl || !audioRef.current) return;

    audioRef.current.load();
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined && playPromise !== null) {
      playPromise.catch(() => {
        setError('自动播放被浏览器阻止，请点击播放按钮');
      });
    }

    // DJ voiceover: play ~1s after song starts
    if (ttsUrl && voiceRef.current) {
      voiceRef.current.load();
      setTimeout(() => {
        if (audioRef.current) audioRef.current.volume = 0.3; // duck song volume
        voiceRef.current?.play()
          .then(() => setVoicePlaying(true))
          .catch(() => setVoicePlaying(false));
      }, 800);
    }
  }, [songUrl, ttsUrl]);

  const onVoiceEnded = () => {
    setVoicePlaying(false);
    if (audioRef.current) audioRef.current.volume = 1.0; // restore song volume
  };

  if (!songUrl) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        <div className="text-4xl mb-2">♪</div>
        <p className="text-lg">等待播放</p>
        <p className="text-sm mt-1">输入你想听的音乐，Claudio 为你推荐</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <audio ref={audioRef} controls className="w-full mb-4" onEnded={onEnded}>
        <source src={songUrl} type="audio/mpeg" />
      </audio>

      {ttsUrl && (
        <audio ref={voiceRef} onEnded={onVoiceEnded} className="hidden">
          <source src={ttsUrl} type="audio/mpeg" />
        </audio>
      )}

      <div className="mb-3">
        <h2 className="text-xl font-bold text-white">{songName}</h2>
        <p className="text-gray-400">{artist}</p>
      </div>

      {voicePlaying && (
        <div className="flex items-center gap-2 text-green-400 text-sm mb-2 animate-pulse">
          <span>🎙</span>
          <span>DJ 正在播报...</span>
        </div>
      )}

      {reason && (
        <p className="text-purple-400 text-sm mb-1">
          <span className="font-medium">推荐理由：</span>{reason}
        </p>
      )}
      {segue && (
        <p className="text-gray-500 text-sm italic">{segue}</p>
      )}
      {isLoading && (
        <p className="text-purple-400 text-sm mt-2 animate-pulse">Claudio 正在为你挑选下一首...</p>
      )}
      {error && (
        <p className="text-yellow-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
