const WEATHER_TIMEOUT_MS = 5000;

interface WeatherResult {
  condition: string;
  temp: string;
  city: string;
  label: string;
}

const ENGLISH_TO_CHINESE: Record<string, string> = {
  'sunny': '晴',
  'clear': '晴',
  'partly cloudy': '多云',
  'cloudy': '阴',
  'overcast': '阴',
  'light rain': '小雨',
  'light drizzle': '小雨',
  'drizzle': '小雨',
  'rain': '雨',
  'heavy rain': '大雨',
  'thunderstorm': '雷阵雨',
  'snow': '雪',
  'mist': '雾',
  'fog': '雾',
};

function translateCondition(english: string): string {
  const key = english.trim().toLowerCase();
  // Exact match first
  if (ENGLISH_TO_CHINESE[key]) {
    return ENGLISH_TO_CHINESE[key];
  }
  // Try partial match, longest key first so "Heavy rain" beats "Rain"
  const entries = Object.entries(ENGLISH_TO_CHINESE).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [en, zh] of entries) {
    if (key.includes(en)) {
      return zh;
    }
  }
  return english.trim();
}

export async function getWeather(): Promise<WeatherResult> {
  const city = process.env.WEATHER_CITY || 'Shanghai';
  const url = `http://wttr.in/${encodeURIComponent(city)}?format=%C+%t`;

  console.log('[WEATHER] 正在获取天气...', `城市: ${city}`);

  const empty: WeatherResult = {
    condition: '',
    temp: '',
    city,
    label: '',
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

  let text: string;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.log('[WEATHER] API 返回异常:', response.status);
      return empty;
    }
    text = await response.text();
  } catch (e: any) {
    console.log('[WEATHER] 获取失败:', e.name === 'AbortError' ? '请求超时' : e.message);
    return empty;
  } finally {
    clearTimeout(timer);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    console.log('[WEATHER] 返回数据为空');
    return empty;
  }

  console.log('[WEATHER] API 原始返回:', trimmed);

  // Parse "%C %t" format, e.g. "Partly Cloudy +26°C"
  // Split on last space before temperature (+ or - followed by digits)
  const parts = trimmed.split(/\s+(?=[+-]?\d)/);
  if (parts.length < 2) {
    console.log('[WEATHER] 解析失败，无法拆分:', trimmed);
    return empty;
  }

  const conditionEn = parts.slice(0, -1).join(' ');
  const tempRaw = parts[parts.length - 1];

  // Clean temperature: keep sign, digits, and °C
  const tempMatch = tempRaw.match(/[+-]?\d+/);
  const temp = tempMatch ? `${tempMatch[0]}°C` : tempRaw;

  const condition = translateCondition(conditionEn);

  const label = `当前天气：${condition}，${temp.replace('°C', '度')}，${city}`;

  console.log('[WEATHER] 解析结果:', label);
  return { condition, temp, city, label };
}
