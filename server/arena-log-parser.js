import chokidar from 'chokidar';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { addMatchFromLog } from './store.js';

// MTG Arena log file location
const LOG_PATH = join(
    process.env.LOCALAPPDATA?.replace('Local', 'LocalLow') ||
    join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'LocalLow'),
    'Wizards Of The Coast',
    'MTGA',
    'Player.log'
);

let logStatus = {
    found: false,
    path: LOG_PATH,
    watching: false,
    lastParsed: null,
    matchesFound: 0,
    error: null,
};

let filePosition = 0;
let currentMatch = null;
let currentDeckName = null;

// Pattern matchers for Arena log events
const PATTERNS = {
    // Match state transitions
    matchResult: /"WinningTeamId":\s*(\d+).*?"MatchId":/s,
    matchResultLine: /\[UnityCrossThreadLogger\].*?"status":\s*"(GameOver)"/,

    // Match won/lost
    matchWon: /CourseDeck.*?"greGameMessage":\s*"GameOver".*?"winningTeamId":\s*(\d+)/,

    // Player result
    playerResultJson: /"type":\s*"Player".*?"resultScope":\s*"MatchScope".*?"result":\s*"(Win|Loss|Draw)"/,

    // Game state complete
    gameStateComplete: /\{"type":"GameOver".*?"results":\[/,

    // Deck submission 
    deckSubmit: /\[UnityCrossThreadLogger\].*?SubmitDeck.*?"name":\s*"([^"]+)"/,
    deckName: /"name":\s*"([^"]+)".*?"mainDeck":/,

    // Draft pick
    draftPick: /\[UnityCrossThreadLogger\]MakeHumanDraftPick.*?"cardId":\s*(\d+)/,

    // Opponent info
    opponentName: /"opponentScreenName":\s*"([^"]+)"/,

    // Event/format
    eventJoin: /"EventName":\s*"([^"]+)"/,
};

function detectFormat(eventName) {
    if (!eventName) return 'standard';
    const e = eventName.toLowerCase();
    if (e.includes('draft') || e.includes('sealed')) return 'draft';
    if (e.includes('historic')) return 'historic';
    if (e.includes('explorer')) return 'explorer';
    if (e.includes('alchemy')) return 'alchemy';
    return 'standard';
}

function detectArchetype(deckOrOpponent) {
    if (!deckOrOpponent) return 'Unknown';
    const s = deckOrOpponent.toLowerCase();
    if (s.includes('aggro') || s.includes('red') || s.includes('burn')) return 'Aggro';
    if (s.includes('control') || s.includes('blue') || s.includes('azorius')) return 'Control';
    if (s.includes('midrange') || s.includes('jund') || s.includes('golgari')) return 'Midrange';
    if (s.includes('combo')) return 'Combo';
    if (s.includes('ramp') || s.includes('green') || s.includes('stompy')) return 'Ramp/Stompy';
    return 'Unknown';
}

async function parseLogChunk(chunk) {
    const lines = chunk.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect deck being submitted / used
        const deckNameMatch = line.match(PATTERNS.deckName);
        if (deckNameMatch) {
            currentDeckName = deckNameMatch[1];
        }

        // Detect game result via JSON blocks
        // Arena logs match outcome with "result":"Win" or "result":"Loss" in GameOver blocks
        if (line.includes('GameOver') || line.includes('gameOver') || line.includes('"result":"Win"') || line.includes('"result":"Loss"')) {
            const winMatch = line.match(/"result"\s*:\s*"(Win|Loss|Draw)"/i);
            if (winMatch && line.includes('"type":"Player"')) {
                const result = winMatch[1].toLowerCase();

                // Try to get event name for format detection
                const eventMatch = line.match(PATTERNS.eventJoin);
                const format = detectFormat(eventMatch?.[1]);

                const matchData = {
                    deckName: currentDeckName || 'Unknown Deck',
                    opponentArchetype: 'Unknown',
                    result,
                    format,
                    notes: 'Auto-tracked from Arena log',
                };

                await addMatchFromLog(matchData);
                logStatus.matchesFound++;
                logStatus.lastParsed = new Date().toISOString();
                console.log(`🎮 Match tracked: ${result.toUpperCase()} with ${matchData.deckName}`);

                currentMatch = null;
            }
        }

        // Alternative: detect via ResultReason lines
        if (line.includes('"ResultReason"') || line.includes('"resultScope":"MatchScope"')) {
            try {
                // Try to parse surrounding JSON
                const jsonStart = line.indexOf('{');
                if (jsonStart !== -1) {
                    const jsonStr = line.slice(jsonStart);
                    const obj = JSON.parse(jsonStr);
                    if (obj.Result && obj.ResultScope === 'MatchScope') {
                        const result = obj.Result.toLowerCase();
                        const matchData = {
                            deckName: currentDeckName || 'Unknown Deck',
                            opponentArchetype: 'Unknown',
                            result,
                            format: 'standard',
                            notes: 'Auto-tracked from Arena log',
                        };
                        await addMatchFromLog(matchData);
                        logStatus.matchesFound++;
                    }
                }
            } catch {
                // Not valid JSON on this line
            }
        }
    }
}

async function readNewLogContent() {
    try {
        const content = await readFile(LOG_PATH, 'utf-8');
        if (content.length <= filePosition) return;

        const newContent = content.slice(filePosition);
        filePosition = content.length;

        await parseLogChunk(newContent);
    } catch (err) {
        logStatus.error = err.message;
    }
}

export function initLogWatcher() {
    if (!existsSync(LOG_PATH)) {
        console.log(`⚠️  Arena log not found at: ${LOG_PATH}`);
        console.log('   Make sure MTG Arena is installed and "Detailed Logs" is enabled.');
        logStatus.found = false;
        logStatus.error = 'Log file not found. Enable Detailed Logs in Arena settings.';
        return;
    }

    logStatus.found = true;
    logStatus.watching = true;
    console.log(`👁️  Watching Arena log: ${LOG_PATH}`);

    // Read existing content to set position (don't parse old history)
    readFile(LOG_PATH, 'utf-8')
        .then(content => { filePosition = content.length; })
        .catch(() => { });

    const watcher = chokidar.watch(LOG_PATH, {
        persistent: true,
        usePolling: true,
        interval: 2000,
        ignoreInitial: true,
    });

    watcher.on('change', readNewLogContent);
    watcher.on('error', err => {
        logStatus.error = err.message;
        logStatus.watching = false;
    });
}

export function getLogStatus() {
    return { ...logStatus };
}
