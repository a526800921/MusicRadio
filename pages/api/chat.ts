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
    console.log('[ROUTER]', `意图: ${route.type}`, route.keyword ? `| 关键词: ${route.keyword}` : '');

    if (route.type === 'CONTROL') {
      return res.status(200).json({ type: 'CONTROL' });
    }
    if (route.type === 'SEARCH') {
      return res.status(200).json({ type: 'SEARCH', keyword: route.keyword });
    }

    // 2. Assemble context
    const ctx = assembleContext();
    console.log('[CONTEXT] 时段:', ctx.timeContext);
    console.log('[CONTEXT] 历史:', ctx.recentHistory.replace(/\n/g, ' | '));

    // 3. Call Claude
    const model = req.body?.model || process.env.CLAUDE_MODEL || '';
    console.log('[CLAUDE] 正在请求 AI 推荐...', model ? `model=${model}` : '(default)');
    const t0 = Date.now();
    const output = await callClaude(
      buildPrompt({
        persona: ctx.persona,
        userContext: ctx.userContext,
        timeContext: ctx.timeContext,
        recentHistory: ctx.recentHistory,
        userInput: message,
      }),
      { model: model || undefined }
    );
    console.log(`[CLAUDE] 推理完成 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    console.log('[CLAUDE] 推荐歌曲:', `${output.play.song_name} - ${output.play.artist}`);
    console.log('[CLAUDE] 播报文案:', output.say);
    console.log('[CLAUDE] 推荐理由:', output.reason);
    console.log('[CLAUDE] 转场语:', output.segue);

    // 4. Get playback URL
    console.log('[NETEASE] 查询播放链接...', `song_id=${output.play.song_id}`);
    const songInfo = await getSongUrlWithInfo(
      output.play.song_id,
      output.play.song_name,
      output.play.artist
    );
    console.log('[NETEASE]', songInfo?.url ? '获取成功 ✅' : '无播放链接 ⚠️');

    // 5. Persist
    addPlay({
      time: new Date().toISOString(),
      song_id: output.play.song_id,
      song_name: output.play.song_name,
      artist: output.play.artist,
      skipped: false,
    });
    addMessage({ role: 'user', content: message, time: new Date().toISOString() });
    addMessage({ role: 'assistant', content: output.say, time: new Date().toISOString() });

    // 6. Return
    console.log('[DONE] 响应已返回\n');
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
    console.error('[ERROR] /api/chat:', err.message);
    res.status(500).json({ error: err.message || '处理请求时出错' });
  }
}
