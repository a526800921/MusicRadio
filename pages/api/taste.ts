import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const tastePath = path.join(process.cwd(), 'user', 'taste.md');
  let taste = '';
  try {
    taste = fs.readFileSync(tastePath, 'utf-8');
  } catch {
    taste = '';
  }

  res.status(200).json({ taste });
}
