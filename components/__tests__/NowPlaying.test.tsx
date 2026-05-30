import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NowPlaying } from '../NowPlaying';

describe('NowPlaying', () => {
  it('shows empty state when no song', () => {
    render(<NowPlaying songName="" artist="" reason="" segue="" />);
    expect(screen.getByText('暂无播放')).toBeDefined();
  });

  it('displays song name and artist', () => {
    render(<NowPlaying songName="晴天" artist="周杰伦" reason="" segue="" />);
    expect(screen.getByText('晴天')).toBeDefined();
    expect(screen.getByText('周杰伦')).toBeDefined();
  });

  it('displays reason when provided', () => {
    render(<NowPlaying songName="晴天" artist="周杰伦" reason="经典推荐" segue="" />);
    expect(screen.getByText(/经典推荐/)).toBeDefined();
  });

  it('displays segue when provided', () => {
    render(<NowPlaying songName="晴天" artist="周杰伦" reason="" segue="下一首更精彩" />);
    expect(screen.getByText(/下一首更精彩/)).toBeDefined();
  });
});
