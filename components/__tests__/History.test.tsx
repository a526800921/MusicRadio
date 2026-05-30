import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { History } from '../History';

const mockPlays = [
  { time: '2026-05-30T10:00:00Z', song_name: '晴天', artist: '周杰伦', skipped: false },
  { time: '2026-05-30T09:30:00Z', song_name: '七里香', artist: '周杰伦', skipped: true },
  { time: '2026-05-30T09:00:00Z', song_name: '稻香', artist: '周杰伦', skipped: false },
];

describe('History', () => {
  it('renders empty state when no plays', () => {
    render(<History plays={[]} />);
    expect(screen.getByText('暂无播放历史')).toBeDefined();
  });

  it('renders all play items', () => {
    render(<History plays={mockPlays} />);
    expect(screen.getByText('晴天')).toBeDefined();
    expect(screen.getByText('七里香')).toBeDefined();
    expect(screen.getByText('稻香')).toBeDefined();
  });

  it('displays artist names', () => {
    render(<History plays={mockPlays} />);
    const artists = screen.getAllByText('周杰伦');
    expect(artists.length).toBe(3);
  });

  it('marks skipped songs correctly', () => {
    render(<History plays={mockPlays} />);
    expect(screen.getByText('已跳过')).toBeDefined();
    const played = screen.getAllByText('已播放');
    expect(played.length).toBe(2);
  });

  it('renders section title', () => {
    render(<History plays={[]} />);
    expect(screen.getByText('播放历史')).toBeDefined();
  });

  it('handles single item list', () => {
    render(<History plays={[mockPlays[0]]} />);
    expect(screen.getByText('晴天')).toBeDefined();
  });
});
