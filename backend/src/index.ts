import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import { tmpdir } from 'os';

import { GroqProvider } from './core/lib/core/groq_provider.js';
import { FileSystem } from './core/lib/data/file_system.js';
import { ToolRegistry } from './core/lib/tools.js';
import { TokenTracker } from './core/lib/analytics/token_tracker.js';
import { Nomenclature } from './core/lib/utils/nomenclature.js';
import { TokenTruncationInterceptor } from './core/lib/interceptors/token_truncation.js';
import { LoggingInterceptor } from './core/lib/interceptors/logging.js';
import { MemoryCompressor } from './core/lib/services/compressor.js';
import { BossAgentService } from './core/lib/services/boss_agent_service.js';
import type { NormalizedMessage } from './core/lib/services/boss_agent_service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';
const BOSS_PASSWORD = process.env.BOSS_PASSWORD || 'boss-password';

app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Boss Agent components
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const groqModels = [
  process.env.GROQ_MODEL,
  process.env.GROQ_MODEL_2,
  process.env.GROQ_MODEL_3
].filter(Boolean) as string[];

const groq = new GroqProvider(GROQ_API_KEY, groqModels.length > 0 ? groqModels : undefined, process.env.GROQ_WHISPER_MODEL);
const fileSystem = new FileSystem();
const nomenclature = new Nomenclature();
const tokenTracker = new TokenTracker();
const tools = new ToolRegistry(fileSystem, nomenclature, tokenTracker);
tools.addInterceptor(new TokenTruncationInterceptor(tokenTracker));
tools.addInterceptor(new LoggingInterceptor());
const compressor = new MemoryCompressor(groq, fileSystem);
const bossAgentService = new BossAgentService(
  groq,
  fileSystem,
  tools,
  tokenTracker,
  compressor,
  groqModels,
  parseInt(process.env.MAX_TOOL_ROUNDS || '10', 10)
);

// Setup multer for audio uploads
const upload = multer({ dest: tmpdir() });

// Load Nomenclature catalog on startup
nomenclature.loadCatalog().catch((err: any) => console.error('Nomenclature load failed:', err));

// Auth middleware
export const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

app.get('/api/history/:sessionId', authenticateJWT, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const history = await fileSystem.loadSession(sessionId);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transcribe', authenticateJWT, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  try {
    const transcription = await groq.transcribe(req.file.path);
    // Clean up the temporary file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });
    res.json({ text: transcription });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/message', authenticateJWT, async (req, res) => {
  const { sessionId, content } = req.body;

  if (!sessionId || !content) {
    return res.status(400).json({ error: 'sessionId and content are required' });
  }

  const intermediateMessages: string[] = [];
  const normalized: NormalizedMessage = {
    sessionId,
    authorId: 'web-user',
    authorTag: 'Web Boss',
    content,
    reply: async (replyContent) => {
      intermediateMessages.push(replyContent);
    },
    send: async (sendContent) => {
      intermediateMessages.push(sendContent);
    },
    sendTyping: async () => {
      console.log(`[BOSS_TYPING]`);
    }
  };

  try {
    await bossAgentService.processMessage(normalized);
    // After processing, reload the history to get the full state including agent's main response
    const history = await fileSystem.loadSession(sessionId);
    const lastMessage = history[history.length - 1];

    // Combine intermediate messages with the last message if they are different
    const result = {
      ...lastMessage,
      intermediateMessages
    };

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (password === BOSS_PASSWORD) {
    const accessToken = jwt.sign({ role: 'boss' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ accessToken });
  } else {
    res.status(401).json({ message: 'Invalid password' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from the frontend build
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('/*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
  });
}

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
