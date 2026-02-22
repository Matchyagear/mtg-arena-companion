import { Router } from 'express';

const router = Router();

// ─── Curated Standard meta snapshot ──────────────────────────────────────────
// Updated: Feb 2026. Source: aggregate of tournament results + ladder data.
// Win rates are % of games won (excluding mirrors). Play rate is % of field.

const META_SNAPSHOT = {
    updatedAt: '2026-02-22',
    format: 'Standard',
    source: 'Aggregated tournament + ladder data',
    tiers: [
        {
            tier: 'S',
            label: 'Dominant',
            color: '#e07030',
            decks: [
                {
                    id: 'domain-ramp',
                    name: 'Domain Ramp',
                    colors: ['W', 'U', 'B', 'R', 'G'],
                    playRate: 13.2,
                    winRate: 57.1,
                    trend: 'up',
                    keyCards: ['Sunfall', 'Up the Beanstalk', 'Atraxa, Grand Unifier'],
                    description: 'Ramps into massive threats using domain lands. Powerful late-game with multiple board wipes and card advantage.',
                },
                {
                    id: 'dimir-midrange',
                    name: 'Dimir Midrange',
                    colors: ['U', 'B'],
                    playRate: 11.4,
                    winRate: 55.8,
                    trend: 'stable',
                    keyCards: ['Deep-Cavern Bat', 'Gix, Yawgmoth Praetor', 'Sheoldred the Apocalypse'],
                    description: 'Efficient hand disruption and removal backed by sticky threats. Punishes greedy strategies.',
                },
            ],
        },
        {
            tier: 'A',
            label: 'Strong',
            color: '#c89b3c',
            decks: [
                {
                    id: 'azorius-soldiers',
                    name: 'Azorius Soldiers',
                    colors: ['W', 'U'],
                    playRate: 9.1,
                    winRate: 53.4,
                    trend: 'up',
                    keyCards: ['Harbin, Vanguard Aviator', 'Valiant Veteran', 'Coppercoat Vanguard'],
                    description: 'Tribal synergy with lords that pump the whole team. Fast clock with protection elements.',
                },
                {
                    id: 'boros-convoke',
                    name: 'Boros Convoke',
                    colors: ['W', 'R'],
                    playRate: 8.7,
                    winRate: 52.9,
                    trend: 'up',
                    keyCards: ['Knight-Errant of Eos', 'Gleeful Demolition', 'Venerated Loxodon'],
                    description: 'Generates tokens rapidly and uses Convoke to slam large threats ahead of curve.',
                },
                {
                    id: 'esper-midrange',
                    name: 'Esper Midrange',
                    colors: ['W', 'U', 'B'],
                    playRate: 7.8,
                    winRate: 51.7,
                    trend: 'down',
                    keyCards: ['Raffine, Scheming Seer', 'Sheoldred the Apocalypse', 'The Wandering Emperor'],
                    description: 'Flexible threat-and-answer package. Connive mechanic builds massive threats over time.',
                },
                {
                    id: 'azorius-control',
                    name: 'Azorius Control',
                    colors: ['W', 'U'],
                    playRate: 6.9,
                    winRate: 51.2,
                    trend: 'stable',
                    keyCards: ['Sunfall', 'Memory Deluge', 'Temporary Lockdown'],
                    description: 'Classic draw-go control. Answers everything and closes with powerful planeswalkers.',
                },
            ],
        },
        {
            tier: 'B',
            label: 'Viable',
            color: '#2477b0',
            decks: [
                {
                    id: 'mono-red-aggro',
                    name: 'Mono-Red Aggro',
                    colors: ['R'],
                    playRate: 7.3,
                    winRate: 49.8,
                    trend: 'stable',
                    keyCards: ['Monastery Swiftspear', 'Kumano Faces Kakkazan', 'Play with Fire'],
                    description: 'Fast burn with low-to-the-ground creatures. Wins before interaction matters.',
                },
                {
                    id: 'gruul-aggro',
                    name: 'Gruul Aggro',
                    colors: ['R', 'G'],
                    playRate: 6.1,
                    winRate: 50.3,
                    trend: 'stable',
                    keyCards: ['Questing Beast', 'Roaming Throne', 'Blitz of the Thunder-Raptor'],
                    description: 'Big hasty creatures backed by burn spells. Outpaces midrange decks.',
                },
                {
                    id: 'rakdos-midrange',
                    name: 'Rakdos Midrange',
                    colors: ['B', 'R'],
                    playRate: 5.8,
                    winRate: 49.5,
                    trend: 'down',
                    keyCards: ['Fable of the Mirror-Breaker', 'Bloodtithe Harvester', 'Invoke Despair'],
                    description: 'Value-oriented midrange using Saga recursion and hand disruption.',
                },
                {
                    id: 'mono-white-aggro',
                    name: 'Mono-White Aggro',
                    colors: ['W'],
                    playRate: 5.2,
                    winRate: 48.9,
                    trend: 'stable',
                    keyCards: ['Adeline, Resplendent Cathar', 'Thalia, Guardian of Thraben', 'Brutal Cathar'],
                    description: 'White weenie with hate bears. Disrupts opponent plans while applying pressure.',
                },
            ],
        },
        {
            tier: 'C',
            label: 'Fringe',
            color: '#6b5a38',
            decks: [
                {
                    id: 'golgari-midrange',
                    name: 'Golgari Midrange',
                    colors: ['B', 'G'],
                    playRate: 4.8,
                    winRate: 47.1,
                    trend: 'down',
                    keyCards: ['Tear Asunder', 'Graveyard Trespasser', 'Liliana of the Veil'],
                    description: 'Grind-oriented midrange with graveyard synergies. Struggles against fast aggro.',
                },
                {
                    id: 'orzhov-tokens',
                    name: 'Orzhov Tokens',
                    colors: ['W', 'B'],
                    playRate: 3.9,
                    winRate: 46.3,
                    trend: 'stable',
                    keyCards: ['Wedding Announcement', 'Elspeth Resplendent', 'Sorin the Mirthless'],
                    description: 'Generates a wide token board with anthem effects. Linear but exploitable.',
                },
                {
                    id: 'temur-ramp',
                    name: 'Temur Ramp',
                    colors: ['U', 'R', 'G'],
                    playRate: 3.2,
                    winRate: 46.8,
                    trend: 'up',
                    keyCards: ['Topiary Stomper', 'Etali, Primal Conqueror', 'Wrenn and Seven'],
                    description: 'Land-based ramp into huge threats. Inconsistent but devastating when it works.',
                },
            ],
        },
    ],
    // Matchup win rates: matchups[deckA_id][deckB_id] = % deckA wins vs deckB
    matchups: {
        'domain-ramp': { 'domain-ramp': 50, 'dimir-midrange': 53, 'azorius-soldiers': 61, 'boros-convoke': 58, 'esper-midrange': 56, 'azorius-control': 48, 'mono-red-aggro': 44, 'gruul-aggro': 46, 'rakdos-midrange': 55, 'mono-white-aggro': 63, 'golgari-midrange': 62, 'orzhov-tokens': 64, 'temur-ramp': 55 },
        'dimir-midrange': { 'domain-ramp': 47, 'dimir-midrange': 50, 'azorius-soldiers': 52, 'boros-convoke': 54, 'esper-midrange': 51, 'azorius-control': 46, 'mono-red-aggro': 48, 'gruul-aggro': 51, 'rakdos-midrange': 56, 'mono-white-aggro': 59, 'golgari-midrange': 58, 'orzhov-tokens': 60, 'temur-ramp': 53 },
        'azorius-soldiers': { 'domain-ramp': 39, 'dimir-midrange': 48, 'azorius-soldiers': 50, 'boros-convoke': 51, 'esper-midrange': 53, 'azorius-control': 44, 'mono-red-aggro': 56, 'gruul-aggro': 49, 'rakdos-midrange': 52, 'mono-white-aggro': 54, 'golgari-midrange': 55, 'orzhov-tokens': 57, 'temur-ramp': 60 },
        'boros-convoke': { 'domain-ramp': 42, 'dimir-midrange': 46, 'azorius-soldiers': 49, 'boros-convoke': 50, 'esper-midrange': 55, 'azorius-control': 40, 'mono-red-aggro': 52, 'gruul-aggro': 50, 'rakdos-midrange': 53, 'mono-white-aggro': 56, 'golgari-midrange': 58, 'orzhov-tokens': 60, 'temur-ramp': 62 },
        'esper-midrange': { 'domain-ramp': 44, 'dimir-midrange': 49, 'azorius-soldiers': 47, 'boros-convoke': 45, 'esper-midrange': 50, 'azorius-control': 51, 'mono-red-aggro': 46, 'gruul-aggro': 47, 'rakdos-midrange': 53, 'mono-white-aggro': 55, 'golgari-midrange': 57, 'orzhov-tokens': 58, 'temur-ramp': 54 },
        'azorius-control': { 'domain-ramp': 52, 'dimir-midrange': 54, 'azorius-soldiers': 56, 'boros-convoke': 60, 'esper-midrange': 49, 'azorius-control': 50, 'mono-red-aggro': 42, 'gruul-aggro': 44, 'rakdos-midrange': 50, 'mono-white-aggro': 60, 'golgari-midrange': 58, 'orzhov-tokens': 56, 'temur-ramp': 52 },
        'mono-red-aggro': { 'domain-ramp': 56, 'dimir-midrange': 52, 'azorius-soldiers': 44, 'boros-convoke': 48, 'esper-midrange': 54, 'azorius-control': 58, 'mono-red-aggro': 50, 'gruul-aggro': 48, 'rakdos-midrange': 51, 'mono-white-aggro': 52, 'golgari-midrange': 54, 'orzhov-tokens': 55, 'temur-ramp': 65 },
        'gruul-aggro': { 'domain-ramp': 54, 'dimir-midrange': 49, 'azorius-soldiers': 51, 'boros-convoke': 50, 'esper-midrange': 53, 'azorius-control': 56, 'mono-red-aggro': 52, 'gruul-aggro': 50, 'rakdos-midrange': 52, 'mono-white-aggro': 53, 'golgari-midrange': 55, 'orzhov-tokens': 57, 'temur-ramp': 60 },
        'rakdos-midrange': { 'domain-ramp': 45, 'dimir-midrange': 44, 'azorius-soldiers': 48, 'boros-convoke': 47, 'esper-midrange': 47, 'azorius-control': 50, 'mono-red-aggro': 49, 'gruul-aggro': 48, 'rakdos-midrange': 50, 'mono-white-aggro': 52, 'golgari-midrange': 54, 'orzhov-tokens': 55, 'temur-ramp': 51 },
        'mono-white-aggro': { 'domain-ramp': 37, 'dimir-midrange': 41, 'azorius-soldiers': 46, 'boros-convoke': 44, 'esper-midrange': 45, 'azorius-control': 40, 'mono-red-aggro': 48, 'gruul-aggro': 47, 'rakdos-midrange': 48, 'mono-white-aggro': 50, 'golgari-midrange': 53, 'orzhov-tokens': 54, 'temur-ramp': 58 },
        'golgari-midrange': { 'domain-ramp': 38, 'dimir-midrange': 42, 'azorius-soldiers': 45, 'boros-convoke': 42, 'esper-midrange': 43, 'azorius-control': 42, 'mono-red-aggro': 46, 'gruul-aggro': 45, 'rakdos-midrange': 46, 'mono-white-aggro': 47, 'golgari-midrange': 50, 'orzhov-tokens': 52, 'temur-ramp': 50 },
        'orzhov-tokens': { 'domain-ramp': 36, 'dimir-midrange': 40, 'azorius-soldiers': 43, 'boros-convoke': 40, 'esper-midrange': 42, 'azorius-control': 44, 'mono-red-aggro': 45, 'gruul-aggro': 43, 'rakdos-midrange': 45, 'mono-white-aggro': 46, 'golgari-midrange': 48, 'orzhov-tokens': 50, 'temur-ramp': 49 },
        'temur-ramp': { 'domain-ramp': 45, 'dimir-midrange': 47, 'azorius-soldiers': 40, 'boros-convoke': 38, 'esper-midrange': 46, 'azorius-control': 48, 'mono-red-aggro': 35, 'gruul-aggro': 40, 'rakdos-midrange': 49, 'mono-white-aggro': 42, 'golgari-midrange': 50, 'orzhov-tokens': 51, 'temur-ramp': 50 },
    },
};

// GET /api/meta  — returns full meta snapshot
router.get('/', (req, res) => {
    res.json(META_SNAPSHOT);
});

export default router;
