export type TimeOfDay = '早上' | '下午' | '晚上' | '深夜';

export function getTimeOfDay(hour?: number): TimeOfDay {
  const h = hour ?? new Date().getHours();
  if (h >= 6 && h < 12) return '早上';
  if (h >= 12 && h < 18) return '下午';
  if (h >= 18 && h < 23) return '晚上';
  return '深夜';
}

export function getContextLabel(): string {
  return `当前时段：${getTimeOfDay()}`;
}

export function getTimeContext(): { timeOfDay: TimeOfDay; label: string } {
  const timeOfDay = getTimeOfDay();
  return { timeOfDay, label: `当前时段：${timeOfDay}` };
}
