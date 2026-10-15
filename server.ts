import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config();

const app = express();
const rawPort = parseInt(process.env.PORT || '', 10);
const PORT = !isNaN(rawPort) && rawPort !== 8080 && rawPort > 0 ? rawPort : 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const QUOTA_RPD_LIMIT = 1450;
const QUOTA_RPM_BLOCK_MS = 60_000;

app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=*');
  next();
});

app.use(express.json({ limit: '2kb' }));

app.use('/api/', rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again shortly' },
}));

function getNextMidnightIST(): number {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = utcMinutes + istOffset;
  const istDate = new Date(now.getTime() + istOffset * 60_000);
  const nextMidnightIST = new Date(istDate);
  nextMidnightIST.setUTCHours(0, 0, 0, 0);
  nextMidnightIST.setUTCDate(istDate.getUTCDate() + 1);
  const nextMidnightUTC = nextMidnightIST.getTime() - istOffset * 60_000;
  void istMinutes;
  return nextMidnightUTC;
}

function parseCommaKeys(raw: string): string[] {
  return raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

class GeminiKeyPool {
  private envKeys: string[];
  private usage: Map<number, { count: number; resetAt: number }> = new Map();
  private blockedUntil: Map<number, number> = new Map();
  private roundRobinIndex = 0;

  constructor() {
    const multiKeys = process.env.GEMINI_API_KEYS || '';
    const singleKey = process.env.GEMINI_API_KEY || '';
    if (multiKeys.trim()) {
      this.envKeys = parseCommaKeys(multiKeys);
    } else if (singleKey.trim()) {
      this.envKeys = [singleKey.trim()];
    } else {
      this.envKeys = [];
    }
    if (this.envKeys.length === 0) {
      console.warn('[KeyPool] No server GEMINI_API_KEYS found. BYOK header or .env.local required.');
    } else {
      console.log(`[KeyPool] Loaded ${this.envKeys.length} server key(s).`);
    }
  }

  private allKeys(byokHeader: string): string[] {
    const byokKeys = byokHeader ? parseCommaKeys(byokHeader) : [];
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const k of [...byokKeys, ...this.envKeys]) {
      if (!seen.has(k)) { seen.add(k); merged.push(k); }
    }
    return merged;
  }

  private isAvailable(slot: number): boolean {
    const now = Date.now();
    const blocked = this.blockedUntil.get(slot);
    if (blocked !== undefined && blocked > now) return false;
    if (blocked !== undefined && blocked <= now) this.blockedUntil.delete(slot);
    const u = this.usage.get(slot);
    if (u) {
      if (now >= u.resetAt) {
        this.usage.delete(slot);
        return true;
      }
      if (u.count >= QUOTA_RPD_LIMIT) return false;
    }
    return true;
  }

  nextAvailable(byokHeader: string): { ai: GoogleGenAI | null; slot: number; total: number } {
    const keys = this.allKeys(byokHeader);
    const total = keys.length;
    if (total === 0) return { ai: null, slot: -1, total: 0 };
    for (let attempt = 0; attempt < total; attempt++) {
      const slot = (this.roundRobinIndex + attempt) % total;
      if (this.isAvailable(slot)) {
        this.roundRobinIndex = (slot + 1) % total;
        return {
          ai: new GoogleGenAI({ apiKey: keys[slot], httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }),
          slot,
          total,
        };
      }
    }
    return { ai: null, slot: -1, total };
  }

  totalKeys(byokHeader: string): number {
    return this.allKeys(byokHeader).length;
  }

  recordSuccess(slot: number): void {
    const now = Date.now();
    const entry = this.usage.get(slot);
    if (!entry || now >= entry.resetAt) {
      this.usage.set(slot, { count: 1, resetAt: getNextMidnightIST() });
    } else {
      entry.count += 1;
    }
  }

  markExhausted(slot: number, isDailyQuota: boolean): void {
    if (isDailyQuota) {
      this.blockedUntil.set(slot, getNextMidnightIST());
    } else {
      this.blockedUntil.set(slot, Date.now() + QUOTA_RPM_BLOCK_MS);
    }
  }
}

const keyPool = new GeminiKeyPool();

const GEMINI_ALLOWED_ACTIONS = ['START_STOPWATCH', 'STOP_STOPWATCH', 'UNKNOWN'] as const;

app.post('/api/parse-voice-command', async (req, res) => {
  try {
    const { transcript, currentLocalTime, capturedAt } = req.body;
    const byokHeader: string = (req.headers['x-gemini-keys'] as string) || '';

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    if (transcript.length > 200) {
      return res.status(400).json({ error: 'Transcript too long (max 200 chars)' });
    }
    const safeTranscript = JSON.stringify(transcript.trim().slice(0, 200));
    const echoCapturedAt = typeof capturedAt === 'number' && isFinite(capturedAt) ? capturedAt : Date.now();

    const attemptedGemini = keyPool.totalKeys(byokHeader) > 0;
    if (attemptedGemini) {
      const nowTime = currentLocalTime || new Date().toLocaleTimeString('en-US', { hour12: false });
      const prompt = `You are a multilingual intent classifier for a STOPWATCH only.
Classify the user's spoken command. You must output exactly one of: START_STOPWATCH, STOP_STOPWATCH, UNKNOWN.

Rules:
- START_STOPWATCH = any language meaning START / BEGIN / GO / RUN / SHURU / CHALU / AARAMBH / PRARAMBH / शुरू / स्टार्ट / चालू / தொடங்கு / শুরু / ప్రారంభం / ಪ್ರಾರಂಭ / ആരംഭിക്കുക / શરૂ / شروع کریں or equivalent in any language. Examples: "start stopwatch", "shuru karo", "chalu karo", "begin", "go", "thodangu", "surua karo".
- STOP_STOPWATCH = any language meaning STOP / PAUSE / HALT / RUKO / THEHRO / RUK JA / रोक / रुक जाओ / स्टॉप / நிறுத்து / থামো / ఆపు / ನಿಲ್ಲಿಸು / നിർത്തുക / રોકો / روکو or equivalent in any language.
- Otherwise return UNKNOWN. Do NOT classify TIMER or ALARM — return UNKNOWN for those.

User Spoken Command: ${safeTranscript}
Current Local Time: "${nowTime}"

Return JSON with action and feedbackMessage (feedbackMessage in same language as user command, short confirmation).`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: [...GEMINI_ALLOWED_ACTIONS] },
          feedbackMessage: { type: Type.STRING, description: 'Friendly confirmation in the user language' },
        },
        required: ['action', 'feedbackMessage'],
      };

      const totalKeys = keyPool.totalKeys(byokHeader);
      let lastGeminiError: unknown = null;
      let allTried = 0;

      for (let attempt = 0; attempt < totalKeys; attempt++) {
        const { ai, slot } = keyPool.nextAvailable(byokHeader);
        if (!ai || slot === -1) break;
        allTried++;
        try {
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema },
          });
          const parsed = JSON.parse(response.text || '{}');
          const actionOk = typeof parsed.action === 'string' && (GEMINI_ALLOWED_ACTIONS as readonly string[]).includes(parsed.action);
          if (!actionOk) {
            break;
          }
          if (parsed.action === 'UNKNOWN') {
            break;
          }
          keyPool.recordSuccess(slot);
          console.log(`[KeyPool] Served by slot ${slot + 1}/${totalKeys}`);
          return res.json({ action: parsed.action, feedbackMessage: parsed.feedbackMessage || '', capturedAt: echoCapturedAt });
        } catch (geminiErr: unknown) {
          const errObj = geminiErr as { status?: number; statusCode?: number; code?: number; message?: string };
          const statusCode = errObj?.status ?? errObj?.statusCode ?? errObj?.code;
          const msg = String(errObj?.message || '');
          const is429 = statusCode === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429');
          const isDailyQuota = msg.toLowerCase().includes('quota') || msg.includes('limit: 0') || msg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier');
          if (is429) {
            keyPool.markExhausted(slot, isDailyQuota);
            lastGeminiError = geminiErr;
            if (attempt < totalKeys - 1) {
              console.warn(`[KeyPool] Slot ${slot + 1} rate-limited (${isDailyQuota ? 'daily' : 'per-minute'}), rotating...`);
              continue;
            }
          }
          console.warn(`[KeyPool] Slot ${slot + 1} failed:`, msg || String(geminiErr));
          lastGeminiError = geminiErr;
          break;
        }
      }
      if (lastGeminiError && allTried >= totalKeys) {
        console.warn('[KeyPool] All keys exhausted, falling back to local parser.');
      }
    }

    const cleanText = transcript.trim().toLowerCase();

    const hasTimerKeyword = cleanText.includes('timer') || cleanText.includes('टाइमर');
    if (hasTimerKeyword) {
      const minuteMatch = cleanText.match(/(\d+)\s*(?:minute|min|m|मिनट)/);
      const secondMatch = cleanText.match(/(\d+)\s*(?:second|sec|s|सेकंड)/);
      const hourMatch = cleanText.match(/(\d+)\s*(?:hour|hr|h|घंटे)/);
      let seconds = 0;
      if (minuteMatch) seconds += parseInt(minuteMatch[1], 10) * 60;
      if (secondMatch) seconds += parseInt(secondMatch[1], 10);
      if (hourMatch) seconds += parseInt(hourMatch[1], 10) * 3600;
      if (seconds === 0) seconds = 120;
      return res.json({
        action: 'SET_TIMER',
        timer: { durationSeconds: seconds, label: `${Math.round(seconds / 60)} Min Timer`, autoStart: true },
        feedbackMessage: `${Math.round(seconds / 60)} मिनट का टाइमर सेट किया गया`,
        capturedAt: echoCapturedAt,
      });
    }

    const hasAlarmKeyword = cleanText.includes('alarm') || cleanText.includes('अलार्म') || cleanText.includes('बजे');
    if (hasAlarmKeyword) {
      let hour = 14;
      let minute = 0;
      const alarmTimeMatch = cleanText.match(/(?:alarm|अलार्म|बजे).*?(\d{1,2})(?::(\d{2}))?/);
      const plainTimeMatch = !alarmTimeMatch ? cleanText.match(/(\d{1,2}):(\d{2})/) : null;
      const m = alarmTimeMatch || plainTimeMatch;
      if (m) {
        const h = parseInt(m[1], 10);
        if (h >= 0 && h < 24) hour = h;
        if (m[2] !== undefined) {
          const mm = parseInt(m[2], 10);
          if (mm >= 0 && mm < 60) minute = mm;
        }
      }
      const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const repeatMatch = cleanText.match(/(\d+)\s*(?:bar|बार|times)/);
      const repeatCount = repeatMatch ? Math.max(1, parseInt(repeatMatch[1], 10)) : 1;
      const gapMatch = cleanText.match(/(?:har|gap|every)\s*(\d+)\s*(?:minute|min|मिनट)/);
      const intervalMinutes = gapMatch ? Math.max(1, parseInt(gapMatch[1], 10)) : 2;
      return res.json({
        action: 'SET_ALARM',
        alarm: { time: formattedTime, label: 'Voice Alarm', repeatCount, intervalMinutes },
        feedbackMessage: `${formattedTime} का अलार्म सेट हो गया (${repeatCount} बार, हर ${intervalMinutes} मिनट में)`,
        capturedAt: echoCapturedAt,
      });
    }

    return res.json({ action: 'UNKNOWN', feedbackMessage: 'कमांड समझ नहीं आई, कृपया फिर से बोलें', capturedAt: echoCapturedAt });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error parsing voice command:', msg);
    return res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: GEMINI_MODEL });
});

import http from 'http';

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.includes('.') && !url.endsWith('.html')) {
        return next();
      }
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html', 'Permissions-Policy': 'microphone=*' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.setHeader('Permissions-Policy', 'microphone=*');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} model=${GEMINI_MODEL}`);
  });
}

startServer();
