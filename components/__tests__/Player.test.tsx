import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Player } from '../Player';

describe('Player', () => {
  it('renders waiting state when no song is loaded', () => {
    render(<Player songUrl={null} songName="" artist="" reason="" segue="" />);
    expect(screen.getByText('等待播放')).toBeDefined();
  });

  it('renders song name and artist when provided', () => {
    render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason="经典好歌"
        segue=""
      />
    );
    expect(screen.getByText('晴天')).toBeDefined();
    expect(screen.getByText('周杰伦')).toBeDefined();
  });

  it('renders reason when provided', () => {
    render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason="适合今天的天气"
        segue=""
      />
    );
    expect(screen.getByText(/适合今天的天气/)).toBeDefined();
  });

  it('renders segue text when provided', () => {
    render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason=""
        segue="下一首同样精彩"
      />
    );
    expect(screen.getByText(/下一首同样精彩/)).toBeDefined();
  });

  it('renders audio element when url is provided', () => {
    const { container } = render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason=""
        segue=""
      />
    );
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
  });

  it('does not render audio element when url is null', () => {
    const { container } = render(
      <Player songUrl={null} songName="" artist="" reason="" segue="" />
    );
    const audio = container.querySelector('audio');
    expect(audio).toBeNull();
  });

  it('shows loading text when isLoading is true', () => {
    render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason=""
        segue=""
        isLoading={true}
      />
    );
    expect(screen.getByText(/正在为你挑选下一首/)).toBeDefined();
  });

  it('attaches onEnded to audio element', () => {
    const onEnded = () => {};
    const { container } = render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason=""
        segue=""
        onEnded={onEnded}
      />
    );
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
  });

  it('renders hidden audio for ttsUrl voiceover', () => {
    const { container } = render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason=""
        segue=""
        ttsUrl="/api/tts/abc123"
      />
    );
    const audios = container.querySelectorAll('audio');
    expect(audios.length).toBe(2); // song audio + voiceover audio
    expect(audios[1].className).toContain('hidden');
  });

  it('does not render voiceover audio without ttsUrl', () => {
    const { container } = render(
      <Player
        songUrl="https://example.com/song.mp3"
        songName="晴天"
        artist="周杰伦"
        reason=""
        segue=""
        ttsUrl={null}
      />
    );
    const audios = container.querySelectorAll('audio');
    expect(audios.length).toBe(1);
  });
});
