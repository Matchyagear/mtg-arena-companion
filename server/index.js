import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import scryfallRouter from './scryfall.js';
import storeRouter, { initStore } from './store.js';
import { initLogWatcher, getLogStatus } from './arena-log-parser.js';
import metaRouter from './meta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/cards', scryfallRouter);
app.use('/api', storeRouter);
app.use('/api/meta', metaRouter);

// Log watcher status endpoint
app.get('/api/log-status', (req, res) => {
    res.json(getLogStatus());
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

import { existsSync } from 'fs';
import { scrapeStandardMeta, LIVE_META_FILE } from './scraper.js';

// Initialize store and start log watcher
await initStore();
initLogWatcher();

if (!existsSync(LIVE_META_FILE)) {
    scrapeStandardMeta().catch(err => console.error('Failed initial meta scrape:', err));
}

const server = createServer(app);
server.listen(PORT, () => {
    console.log(`🧙 MTG Companion server running on http://localhost:${PORT}`);
});
