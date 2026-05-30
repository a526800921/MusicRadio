interface NowPlayingProps {
  songName: string;
  artist: string;
  reason: string;
  segue: string;
}

export function NowPlaying({ songName, artist, reason, segue }: NowPlayingProps) {
  if (!songName) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500">
        <p>暂无播放</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white">{songName}</h2>
      <p className="text-gray-400 mb-3">{artist}</p>
      {reason && (
        <p className="text-purple-400 text-sm">
          <span className="font-medium">推荐理由：</span>{reason}
        </p>
      )}
      {segue && (
        <p className="text-gray-500 text-sm italic mt-1">{segue}</p>
      )}
    </div>
  );
}
