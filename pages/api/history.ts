import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecentPlays } from '@/lib/state';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const plays = getRecentPlays(50);
  res.status(200).json({ plays });
}
