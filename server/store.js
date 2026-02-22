import express from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const DECKS_FILE = join(DATA_DIR, 'decks.json');
const MATCHES_FILE = join(DATA_DIR, 'matches.json');

let decks = [];
let matches = [];

export async function initStore() {
    if (!existsSync(DATA_DIR)) {
        await mkdir(DATA_DIR, { recursive: true });
    }
    try {
        decks = JSON.parse(await readFile(DECKS_FILE, 'utf-8'));
        console.log(`📚 Loaded ${decks.length} decks`);
    } catch {
        decks = [];
        await saveDecks();
    }
    try {
        matches = JSON.parse(await readFile(MATCHES_FILE, 'utf-8'));
        console.log(`🎮 Loaded ${matches.length} matches`);
    } catch {
        matches = [];
        await saveMatches();
    }
}

async function saveDecks() {
    await writeFile(DECKS_FILE, JSON.stringify(decks, null, 2));
}

async function saveMatches() {
    await writeFile(MATCHES_FILE, JSON.stringify(matches, null, 2));
}

// ─── DECK ENDPOINTS ──────────────────────────────────────────────────────────

// GET /api/decks
router.get('/decks', (req, res) => {
    res.json(decks.map(d => ({ ...d, cardCount: d.cards?.reduce((s, c) => s + c.qty, 0) ?? 0 })));
});

// GET /api/decks/:id
router.get('/decks/:id', (req, res) => {
    const deck = decks.find(d => d.id === req.params.id);
    if (!deck) return res.status(404).json({ error: 'Deck not found' });
    res.json(deck);
});

// POST /api/decks
router.post('/decks', async (req, res) => {
    const { name, format = 'standard', cards = [], notes = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Deck name is required' });

    const deck = {
        id: randomUUID(),
        name,
        format,
        cards,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    decks.push(deck);
    await saveDecks();
    res.json(deck);
});

// PUT /api/decks/:id
router.put('/decks/:id', async (req, res) => {
    const idx = decks.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Deck not found' });

    decks[idx] = { ...decks[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await saveDecks();
    res.json(decks[idx]);
});

// DELETE /api/decks/:id
router.delete('/decks/:id', async (req, res) => {
    const idx = decks.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Deck not found' });
    decks.splice(idx, 1);
    await saveDecks();
    res.json({ success: true });
});

// ─── MATCH ENDPOINTS ─────────────────────────────────────────────────────────

// GET /api/matches?deckId=&result=&format=&limit=&offset=
router.get('/matches', (req, res) => {
    const { deckId, result, format, limit = 100, offset = 0 } = req.query;
    let filtered = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (deckId) filtered = filtered.filter(m => m.deckId === deckId);
    if (result) filtered = filtered.filter(m => m.result === result);
    if (format) filtered = filtered.filter(m => m.format === format);

    const total = filtered.length;
    filtered = filtered.slice(Number(offset), Number(offset) + Number(limit));
    res.json({ matches: filtered, total });
});

// POST /api/matches
router.post('/matches', async (req, res) => {
    const { deckId, deckName, opponentArchetype = 'Unknown', result, format = 'standard', notes = '', date, source = 'manual' } = req.body;
    if (!result) return res.status(400).json({ error: 'Match result is required' });

    const match = {
        id: randomUUID(),
        deckId: deckId || null,
        deckName: deckName || 'Unknown Deck',
        opponentArchetype,
        result, // 'win' | 'loss' | 'draw'
        format,
        notes,
        date: date || new Date().toISOString(),
        source, // 'manual' | 'arena-log'
    };
    matches.push(match);
    await saveMatches();
    res.json(match);
});

// DELETE /api/matches/:id
router.delete('/matches/:id', async (req, res) => {
    const idx = matches.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Match not found' });
    matches.splice(idx, 1);
    await saveMatches();
    res.json({ success: true });
});

// GET /api/stats
router.get('/stats', (req, res) => {
    const { deckId, format, days } = req.query;
    let filtered = [...matches];

    if (deckId) filtered = filtered.filter(m => m.deckId === deckId);
    if (format) filtered = filtered.filter(m => m.format === format);
    if (days) {
        const cutoff = new Date(Date.now() - Number(days) * 86400000);
        filtered = filtered.filter(m => new Date(m.date) >= cutoff);
    }

    const total = filtered.length;
    const wins = filtered.filter(m => m.result === 'win').length;
    const losses = filtered.filter(m => m.result === 'loss').length;
    const draws = filtered.filter(m => m.result === 'draw').length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Win rate by deck
    const byDeck = {};
    for (const m of filtered) {
        const key = m.deckName || 'Unknown';
        if (!byDeck[key]) byDeck[key] = { name: key, wins: 0, losses: 0, draws: 0 };
        byDeck[key][m.result === 'win' ? 'wins' : m.result === 'loss' ? 'losses' : 'draws']++;
    }

    // Win rate by opponent archetype
    const byOpponent = {};
    for (const m of filtered) {
        const key = m.opponentArchetype || 'Unknown';
        if (!byOpponent[key]) byOpponent[key] = { archetype: key, wins: 0, losses: 0, draws: 0 };
        byOpponent[key][m.result === 'win' ? 'wins' : m.result === 'loss' ? 'losses' : 'draws']++;
    }

    // Win rate by day (last 30 days)
    const byDay = {};
    for (const m of filtered) {
        const day = m.date.slice(0, 10);
        if (!byDay[day]) byDay[day] = { date: day, wins: 0, losses: 0 };
        if (m.result === 'win') byDay[day].wins++;
        else if (m.result === 'loss') byDay[day].losses++;
    }

    // Recent streak
    const recent = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let streakType = null;
    for (const m of recent) {
        if (streakType === null) streakType = m.result;
        if (m.result === streakType) streak++;
        else break;
    }

    res.json({
        total, wins, losses, draws, winRate,
        streak, streakType,
        byDeck: Object.values(byDeck),
        byOpponent: Object.values(byOpponent),
        byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    });
});

// Export match adder for log parser
export async function addMatchFromLog(matchData) {
    const match = {
        id: randomUUID(),
        ...matchData,
        source: 'arena-log',
        date: matchData.date || new Date().toISOString(),
    };
    matches.push(match);
    await saveMatches();
    return match;
}

export default router;
