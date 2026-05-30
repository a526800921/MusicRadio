import type { NextApiRequest, NextApiResponse } from 'next';
import { routeIntent } from '@/lib/router';
import { assembleContext } from '@/lib/context';
import { buildPrompt, callClaude } from '@/lib/claude';
import { addPlay, addMessage } from '@/lib/state';
import { getSongUrlWithInfo } from '@/lib/netease';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: '缺少 message 参数' });
  }

  try {
    // 1. Route intent
    const route = routeIntent(message);

    // Non-AI paths: return routing info for client to handle
    if (route.type === 'CONTROL') {
      return res.status(200).json({ type: 'CONTROL' });
    }
    if (route.type === 'SEARCH') {
      return res.status(200).json({ type: 'SEARCH', keyword: route.keyword });
    }

    // 2. AI path: assemble context
    const ctx = assembleContext();

    // 3. Build prompt
    const prompt = buildPrompt({
      persona: ctx.persona,
      userContext: ctx.userContext,
      timeContext: ctx.timeContext,
      recentHistory: ctx.recentHistory,
      userInput: message,
    });

    // 4. Call Claude
    const output = await callClaude(prompt);

    // 5. Get playback URL
    const songInfo = await getSongUrlWithInfo(
      output.play.song_id,
      output.play.song_name,
      output.play.artist
    );

    // 6. Persist
    const now = new Date().toISOString();
    addPlay({
      time: now,
      song_id: output.play.song_id,
      song_name: output.play.song_name,
      artist: output.play.artist,
      skipped: false,
    });
    addMessage({ role: 'user', content: message, time: now });
    addMessage({ role: 'assistant', content: output.say, time: now });

    // 7. Return
    res.status(200).json({
      say: output.say,
      play: {
        id: output.play.song_id,
        name: output.play.song_name,
        artist: output.play.artist,
        url: songInfo?.url || null,
      },
      reason: output.reason,
      segue: output.segue,
    });
  } catch (err: any) {
    console.error('/api/chat error:', err.message);
    res.status(500).json({ error: err.message || '处理请求时出错' });
  }
}
