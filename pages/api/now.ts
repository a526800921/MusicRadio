import type { NextApiRequest, NextApiResponse } from 'next';
import { readState, getRecentPlays } from '@/lib/state';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const state = readState();
  const current = state.plays.length > 0 ? state.plays[state.plays.length - 1] : null;
  const history = getRecentPlays(10);

  res.status(200).json({ current, history });
}
