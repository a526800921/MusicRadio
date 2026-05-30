import { describe, it, expect } from 'vitest';
import { getTimeOfDay, getContextLabel, getTimeContext } from '../scheduler';

describe('getTimeOfDay', () => {
  it('returns 早上 for 6-11', () => {
    expect(getTimeOfDay(6)).toBe('早上');
    expect(getTimeOfDay(8)).toBe('早上');
    expect(getTimeOfDay(11)).toBe('早上');
  });

  it('returns 下午 for 12-17', () => {
    expect(getTimeOfDay(12)).toBe('下午');
    expect(getTimeOfDay(15)).toBe('下午');
    expect(getTimeOfDay(17)).toBe('下午');
  });

  it('returns 晚上 for 18-22', () => {
    expect(getTimeOfDay(18)).toBe('晚上');
    expect(getTimeOfDay(20)).toBe('晚上');
    expect(getTimeOfDay(22)).toBe('晚上');
  });

  it('returns 深夜 for 23-5', () => {
    expect(getTimeOfDay(23)).toBe('深夜');
    expect(getTimeOfDay(0)).toBe('深夜');
    expect(getTimeOfDay(3)).toBe('深夜');
    expect(getTimeOfDay(5)).toBe('深夜');
  });

  it('uses current hour when no argument', () => {
    const result = getTimeOfDay();
    expect(['早上', '下午', '晚上', '深夜']).toContain(result);
  });
});

describe('getContextLabel', () => {
  it('returns label with current time period', () => {
    const label = getContextLabel();
    expect(label).toMatch(/^当前时段：(早上|下午|晚上|深夜)$/);
  });
});

describe('getTimeContext', () => {
  it('returns object with timeOfDay and label', () => {
    const ctx = getTimeContext();
    expect(ctx).toHaveProperty('timeOfDay');
    expect(ctx).toHaveProperty('label');
    expect(ctx.label).toContain(ctx.timeOfDay);
  });
});
