import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const CACHE_DIR = path.join('/tmp', 'bloxsd-voice-cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const memoryAudioCache = new Map();

function splitTextForNeuralFallback(text: string, maxLen = 180): string[] {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return [cleaned];

  const words = cleaned.split(' ');
  const chunks: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function fetchNeuralIndonesianRecording(text: string): Promise<Buffer | null> {
  try {
    const chunks = splitTextForNeuralFallback(text);
    const buffers: Buffer[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      buffers.push(Buffer.from(arr));
    }

    return buffers.length > 0 ? Buffer.concat(buffers) : null;
  } catch {
    return null;
  }
}

async function synthesizeDialogueAudio(text: string, role: string) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return null;

  const hash = crypto
    .createHash('sha1')
    .update(`${role}::${normalizedText}`)
    .digest('hex');

  const memHit = memoryAudioCache.get(hash);
  if (memHit) return memHit;

  const mp3Path = path.join(CACHE_DIR, `${hash}.mp3`);

  if (fs.existsSync(mp3Path)) {
    const entry = {
      buffer: fs.readFileSync(mp3Path),
      mimeType: 'audio/mpeg',
      source: 'neural',
    };
    memoryAudioCache.set(hash, entry);
    return entry;
  }

  const mp3Buffer = await fetchNeuralIndonesianRecording(normalizedText);
  if (mp3Buffer && mp3Buffer.length > 128) {
    try {
      fs.writeFileSync(mp3Path, mp3Buffer);
    } catch {
      // Ignore disk cache write errors
    }
    const entry = {
      buffer: mp3Buffer,
      mimeType: 'audio/mpeg',
      source: 'neural',
    };
    memoryAudioCache.set(hash, entry);
    return entry;
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const handleTtsRequest = async (req: express.Request, res: express.Response) => {
    try {
      const text = String(req.body?.text || req.query?.text || '').trim();
      const role = String(req.body?.role || req.query?.role || 'siswa_putra').trim();

      if (!text) {
        res.status(400).json({ error: 'Missing dialogue text' });
        return;
      }

      const audioEntry = await synthesizeDialogueAudio(text, role);
      if (!audioEntry) {
        res.status(502).json({ error: 'Unable to synthesize dialogue voice audio' });
        return;
      }

      res.setHeader('Content-Type', audioEntry.mimeType);
      res.setHeader('X-Voice-Source', audioEntry.source);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(audioEntry.buffer);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  };

  app.post('/api/tts', handleTtsRequest);
  app.get('/api/tts', handleTtsRequest);

  app.post('/api/tts/preload', async (req: express.Request, res: express.Response) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 12) : [];
    res.json({ status: 'warming', count: items.length });

    for (const item of items) {
      if (item && typeof item.text === 'string' && item.text.trim()) {
        await synthesizeDialogueAudio(item.text, String(item.role || 'siswa_putra'));
      }
    }
  });

  app.get('/api/ceremony-instrumental', async (_req: express.Request, res: express.Response) => {
    const cachedInstrumentalPath = path.join(CACHE_DIR, 'indonesia_raya_instrumental.mp3');
    try {
      if (fs.existsSync(cachedInstrumentalPath)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800');
        res.sendFile(cachedInstrumentalPath);
        return;
      }

      const remoteUrl =
        'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/1e/Indonesia_Raya_instrumental.ogg/Indonesia_Raya_instrumental.ogg.mp3';
      const upstream = await fetch(remoteUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      if (!upstream.ok) {
        res.status(502).json({ error: 'Failed to fetch instrumental audio' });
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      try {
        fs.writeFileSync(cachedInstrumentalPath, buf);
      } catch {
        // ignore cache write error
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.send(buf);
    } catch {
      res.status(502).json({ error: 'Instrumental stream unavailable' });
    }
  });

  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, { maxAge: '7d' }));
  }

  const distPath = path.join(__dirname, 'dist');
  const isProd =
    (process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE)) &&
    fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BloxSD server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
