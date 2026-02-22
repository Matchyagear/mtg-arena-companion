import express from 'express';
import fetch from 'node-fetch';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../data');
const CACHE_FILE = join(CACHE_DIR, 'card-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const BASE_URL = 'https://api.scryfall.com';
const HEADERS = {
    'User-Agent': 'MTGArenaCompanion/1.0',
    'Accept': 'application/json',
};

let lastRequestTime = 0;

async function rateLimitedFetch(url) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 100) {
        await new Promise(r => setTimeout(r, 100 - elapsed));
    }
    lastRequestTime = Date.now();
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Scryfall API error: ${res.status}`);
    return res.json();
}

// In-memory cache for this session
let cardCache = null;
let cacheLoadedAt = 0;

async function ensureCacheDir() {
    if (!existsSync(CACHE_DIR)) {
        await mkdir(CACHE_DIR, { recursive: true });
    }
}

async function loadCache() {
    await ensureCacheDir();
    if (cardCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
        return cardCache;
    }
    try {
        const raw = await readFile(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            cardCache = parsed.cards;
            cacheLoadedAt = Date.now();
            console.log(`📦 Loaded ${cardCache.length} cards from cache`);
            return cardCache;
        }
    } catch (e) {
        // Cache miss or corrupt
    }
    return null;
}

async function fetchAllStandardCards() {
    console.log('🔄 Fetching Standard-legal cards from Scryfall...');
    const cards = [];
    let url = `${BASE_URL}/cards/search?q=f:standard&order=name&unique=cards`;

    while (url) {
        const data = await rateLimitedFetch(url);
        cards.push(...data.data);
        url = data.has_more ? data.next_page : null;
        if (url) process.stdout.write(`  ${cards.length} cards...\r`);
    }

    console.log(`✅ Fetched ${cards.length} Standard-legal cards`);
    await ensureCacheDir();
    await writeFile(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), cards }));
    cardCache = cards;
    cacheLoadedAt = Date.now();
    return cards;
}

async function getStandardCards() {
    const cached = await loadCache();
    if (cached) return cached;
    return fetchAllStandardCards();
}

// Start prefetching on module load (non-blocking)
getStandardCards().catch(err => console.error('Card prefetch failed:', err));

// GET /api/cards/search?q=<query>&colors=WUBRG&types=&cmc=&rarity=&set=
router.get('/search', async (req, res) => {
    try {
        const { q = '', colors, types, cmc, rarity, set: setCode } = req.query;
        const allCards = await getStandardCards();

        let filtered = allCards;

        // Text search (name, type, oracle text)
        if (q.trim()) {
            const query = q.toLowerCase();
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(query) ||
                (c.type_line && c.type_line.toLowerCase().includes(query)) ||
                (c.oracle_text && c.oracle_text.toLowerCase().includes(query))
            );
        }

        // Color filter
        if (colors && colors.trim()) {
            const colorSet = colors.toUpperCase().split('');
            filtered = filtered.filter(c => {
                if (!c.colors) return colorSet.includes('C'); // colorless
                if (c.colors.length === 0) return colorSet.includes('C');
                return c.colors.every(col => colorSet.includes(col));
            });
        }

        // Type filter
        if (types && types.trim()) {
            const typeQuery = types.toLowerCase();
            filtered = filtered.filter(c =>
                c.type_line && c.type_line.toLowerCase().includes(typeQuery)
            );
        }

        // CMC filter
        if (cmc !== undefined && cmc !== '') {
            const cmcVal = parseFloat(cmc);
            filtered = filtered.filter(c => c.cmc === cmcVal);
        }

        // Rarity filter
        if (rarity && rarity.trim()) {
            filtered = filtered.filter(c => c.rarity === rarity.toLowerCase());
        }

        // Set filter
        if (setCode && setCode.trim()) {
            filtered = filtered.filter(c => c.set === setCode.toLowerCase());
        }

        // Limit results
        const results = filtered.slice(0, 75).map(c => ({
            id: c.id,
            name: c.name,
            mana_cost: c.mana_cost || '',
            cmc: c.cmc,
            type_line: c.type_line,
            oracle_text: c.oracle_text || '',
            colors: c.colors || [],
            color_identity: c.color_identity || [],
            rarity: c.rarity,
            set: c.set,
            set_name: c.set_name,
            image_uris: c.image_uris || (c.card_faces?.[0]?.image_uris) || null,
            legalities: c.legalities,
            power: c.power,
            toughness: c.toughness,
            loyalty: c.loyalty,
        }));

        res.json({ results, total: filtered.length });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/cards/autocomplete?q=<name>
router.get('/autocomplete', async (req, res) => {
    try {
        const { q = '' } = req.query;
        if (q.length < 2) return res.json([]);

        const allCards = await getStandardCards();
        const query = q.toLowerCase();
        const matches = allCards
            .filter(c => c.name.toLowerCase().startsWith(query))
            .slice(0, 20)
            .map(c => ({ name: c.name, id: c.id }));

        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/cards/sets — list all Standard sets
router.get('/sets', async (req, res) => {
    try {
        const allCards = await getStandardCards();
        const setMap = {};
        for (const c of allCards) {
            if (!setMap[c.set]) setMap[c.set] = c.set_name;
        }
        const sets = Object.entries(setMap)
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(sets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/cards/status — cache status
router.get('/status', async (req, res) => {
    const cached = await loadCache();
    res.json({
        cached: !!cached,
        count: cached ? cached.length : 0,
        ageMs: cached ? Date.now() - cacheLoadedAt : null,
    });
});

export default router;
