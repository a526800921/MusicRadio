import type { NextApiRequest, NextApiResponse } from 'next';
import { searchSongs } from '@/lib/netease';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query.q as string;
  if (!q || q.trim().length === 0) return res.status(400).json({ error: '缺少搜索关键词 ?q=' });

  try {
    const songs = await searchSongs(q);
    res.status(200).json({ songs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '搜索失败' });
  }
}
