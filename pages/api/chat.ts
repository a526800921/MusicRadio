import type { NextApiRequest, NextApiResponse } from 'next';
import { routeIntent } from '@/lib/router';
import { assembleContext } from '@/lib/context';
import { buildPrompt, callClaude } from '@/lib/claude';
import { addPlay, addMessage } from '@/lib/state';
import { searchSongs, getSongUrlWithInfo } from '@/lib/netease';
import { generateTTS } from '@/lib/tts';

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

    // 4. Generate TTS for DJ voiceover (non-blocking, fire and forget)
    const ttsPromise = generateTTS(output.say).catch((e) => {
      console.log('[TTS] 生成失败:', e.message);
      return null;
    });

    // 5. Search Netease for the real song
    const keyword = `${output.play.song_name} ${output.play.artist}`.trim();
    console.log('[NETEASE] 搜索歌曲...', keyword);
    const songs = await searchSongs(keyword, 5);

    // Try to find a song with a playable URL
    let songInfo = null;
    let matchedSong = null;
    for (const s of songs) {
      const info = await getSongUrlWithInfo(s.id, s.name, s.artist);
      if (info) {
        songInfo = info;
        matchedSong = s;
        break;
      }
    }

    if (!matchedSong) {
      // Fallback to first search result even without URL
      if (songs.length > 0) {
        matchedSong = songs[0];
        console.log('[NETEASE] 无播放链接，使用第一个搜索结果 ⚠️');
      } else {
        // Use Claude's data as last resort
        matchedSong = { id: output.play.song_id, name: output.play.song_name, artist: output.play.artist, album: '' };
        console.log('[NETEASE] 搜索无结果，使用 Claude 推荐的数据');
      }
    } else {
      console.log('[NETEASE] 匹配成功 ✅', `${matchedSong.name} - ${matchedSong.artist} (id=${matchedSong.id})`);
    }

    // 5. Persist
    addPlay({
      time: new Date().toISOString(),
      song_id: matchedSong.id,
      song_name: matchedSong.name,
      artist: matchedSong.artist,
      skipped: false,
    });
    addMessage({ role: 'user', content: message, time: new Date().toISOString() });
    addMessage({ role: 'assistant', content: output.say, time: new Date().toISOString() });

    // 7. Return
    const ttsUrl = await ttsPromise;
    console.log('[DONE] 响应已返回\n');
    res.status(200).json({
      say: output.say,
      ttsUrl: ttsUrl || null,
      play: {
        id: matchedSong.id,
        name: matchedSong.name,
        artist: matchedSong.artist,
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
