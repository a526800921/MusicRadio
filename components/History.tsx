interface PlayRecord {
  time: string;
  song_name: string;
  artist: string;
  skipped: boolean;
}

interface HistoryProps {
  plays: PlayRecord[];
}

export function History({ plays }: HistoryProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-bold text-white mb-3">播放历史</h3>
      {plays.length === 0 ? (
        <p className="text-gray-500 text-center py-4">暂无播放历史</p>
      ) : (
        <ul className="space-y-2">
          {plays.map((p, i) => (
            <li key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-0">
              <div className="flex-1 min-w-0">
                <span className="text-white truncate">{p.song_name}</span>
                <span className="text-gray-400 ml-2">{p.artist}</span>
              </div>
              <span className={`ml-2 shrink-0 ${p.skipped ? 'text-yellow-500' : 'text-green-500'}`}>
                {p.skipped ? '已跳过' : '已播放'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
