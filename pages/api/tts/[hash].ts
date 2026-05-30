import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getTTSFilePath } from '@/lib/tts';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { hash } = req.query;
  if (!hash || typeof hash !== 'string') return res.status(400).json({ error: 'Missing hash' });

  const filePath = getTTSFilePath(hash);
  if (!filePath) return res.status(404).json({ error: 'TTS audio not found' });

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath);
  res.setHeader('Content-Type', ext === '.wav' ? 'audio/wav' : 'audio/mpeg');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}
