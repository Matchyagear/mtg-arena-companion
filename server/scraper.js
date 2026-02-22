import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
export const LIVE_META_FILE = join(DATA_DIR, 'live-meta.json');

export async function scrapeStandardMeta() {
    console.log('🕸️ Scraping live Standard meta from MTGGoldfish...');
    try {
        const response = await fetch('https://www.mtggoldfish.com/metagame/standard#paper');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        const $ = cheerio.load(html);

        const decks = [];
        $('.archetype-tile').slice(0, 15).each((i, el) => {
            const name = $(el).find('.deck-price-paper a').text().trim();
            const relUrl = $(el).find('.deck-price-paper a').attr('href');
            const shareText = $(el).find('.bg-table-header').text().trim();

            // Extract percentage from share text (e.g., "12.5%")
            let playRate = 0;
            const match = shareText.match(/([\d.]+)%/);
            if (match) {
                playRate = parseFloat(match[1]);
            }

            if (name) {
                decks.push({
                    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                    name,
                    // We don't have accurate color decoding from just a name without additional parsing,
                    // but we can try to guess or just leave it empty.
                    colors: [],
                    playRate,
                    winRate: 50.0 + Math.random() * 5, // We don't have true winrate without clicking in, mock for now
                    trend: 'stable',
                    keyCards: [],
                    description: `Live deck parsed from MTGGoldfish: https://www.mtggoldfish.com${relUrl}`,
                    url: `https://www.mtggoldfish.com${relUrl}`
                });
            }
        });

        const liveMeta = {
            updatedAt: new Date().toISOString(),
            format: 'Standard',
            source: 'MTGGoldfish (Live Scraped)',
            tiers: [
                {
                    tier: 'S',
                    label: 'Top Meta',
                    color: '#e07030',
                    decks: decks.slice(0, 5)
                },
                {
                    tier: 'A',
                    label: 'Competitive',
                    color: '#c89b3c',
                    decks: decks.slice(5, 10)
                },
                {
                    tier: 'B',
                    label: 'Viable',
                    color: '#2477b0',
                    decks: decks.slice(10, 15)
                }
            ],
            matchups: {}
        };

        // Initialize pseudo-matchups to avoid crashes on UI rendering
        for (const deck1 of decks) {
            liveMeta.matchups[deck1.id] = {};
            for (const deck2 of decks) {
                liveMeta.matchups[deck1.id][deck2.id] = deck1.id === deck2.id ? 50 : Math.floor(40 + Math.random() * 20);
            }
        }

        await writeFile(LIVE_META_FILE, JSON.stringify(liveMeta, null, 2));
        console.log(`✅ Successfully saved ${decks.length} decks to live-meta.json`);
        return liveMeta;
    } catch (err) {
        console.error('❌ Failed to scrape MTGGoldfish:', err);
        throw err;
    }
}
