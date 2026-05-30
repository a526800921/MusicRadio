import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../index';

describe('Home page', () => {
  it('renders main title Claudio', () => {
    render(<Home />);
    expect(screen.getByText('Claudio')).toBeDefined();
  });

  it('renders subtitle "个人 AI 电台"', () => {
    render(<Home />);
    expect(screen.getByText(/个人 AI 电台/)).toBeDefined();
  });

  it('renders ChatInput component', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/推荐/)).toBeDefined();
    expect(screen.getByText('推荐')).toBeDefined();
  });

  it('renders Player component in waiting state', () => {
    render(<Home />);
    expect(screen.getByText('等待播放')).toBeDefined();
  });

  it('renders History component', () => {
    render(<Home />);
    expect(screen.getByText('播放历史')).toBeDefined();
  });
});
