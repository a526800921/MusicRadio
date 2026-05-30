export type IntentType = 'CONTROL' | 'SEARCH' | 'AI';

export interface RouteResult {
  type: IntentType;
  keyword?: string;
}

const CONTROL_PATTERNS = /^(播放|暂停|下一首|上一首|音量|停止|继续)/;
const SEARCH_PREFIX = /^(搜|搜索|找|帮我搜|帮我找)/;

export function routeIntent(message: string): RouteResult {
  const trimmed = message.trim();

  if (CONTROL_PATTERNS.test(trimmed)) {
    return { type: 'CONTROL' };
  }

  if (SEARCH_PREFIX.test(trimmed)) {
    const keyword = trimmed
      .replace(/^(搜索|搜一下|搜|找|帮我搜一下|帮我搜|帮我找|有没有叫?)/, '')
      .replace(/一下/g, '')
      .replace(/[的歌]+$/, '')
      .replace(/的/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    return { type: 'SEARCH', keyword: keyword || trimmed };
  }

  return { type: 'AI' };
}
