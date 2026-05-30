import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('renders input and submit button', () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText(/推荐/)).toBeDefined();
    expect(screen.getByText('推荐')).toBeDefined();
  });

  it('calls onSubmit with input value and clears input', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText(/推荐/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '推荐一首歌' } });
    fireEvent.click(screen.getByText('推荐'));
    expect(onSubmit).toHaveBeenCalledWith('推荐一首歌');
    expect(input.value).toBe('');
  });

  it('disables button and shows loading text when isLoading', () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={true} />);
    const btn = screen.getByText('思考中...') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('does not call onSubmit when input is empty', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);
    fireEvent.click(screen.getByText('推荐'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits on Enter key', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText(/推荐/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '一首歌' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('一首歌');
  });
});
