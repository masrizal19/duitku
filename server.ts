import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API STATUS
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    app: 'DUITKU Backend API',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

// MOUNT VITE MIDDLEWARE IN DEV OR STATIC FILES IN PROD
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[DUITKU Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DUITKU Server] Failed to start:', err);
});
