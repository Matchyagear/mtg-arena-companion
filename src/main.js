import { initCardPreview } from './components/card-preview.js';
import { renderHome } from './views/home.js';
import { renderDeckBuilder } from './views/deck-builder.js';
import { renderMatchTracker, stopPolling } from './views/match-tracker.js';
import { renderStats } from './views/stats.js';
import { renderMeta } from './views/meta.js';
import { api } from './api.js';

const VIEWS = {
    'home': renderHome,
    'deck-builder': renderDeckBuilder,
    'match-tracker': renderMatchTracker,
    'stats': renderStats,
    'meta': renderMeta,
};

let currentView = 'home';
let matchPollCleanup = null;

// ─── Navigation ──────────────────────────────────────────────────────────────
function navigateTo(view) {
    if (!VIEWS[view]) return;

    // Clean up previous view
    if (currentView === 'match-tracker') stopPolling();

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    currentView = view;
    const main = document.getElementById('main-content');
    if (main) {
        main.innerHTML = '';
        VIEWS[view](main);
    }
}

// ─── Arena Log Status ────────────────────────────────────────────────────────
async function updateHeaderStatus() {
    try {
        const status = await api.getLogStatus();
        const dot = document.getElementById('log-status-dot');
        const text = document.getElementById('log-status-text');
        if (dot) {
            dot.className = `status-dot ${status.found && status.watching ? 'status-connected' : 'status-disconnected'}`;
            dot.title = status.found
                ? (status.watching ? 'Connected to Arena log' : 'Log found but not watching')
                : 'Arena log not found — enable Detailed Logs in Arena settings';
        }
        if (text) {
            text.textContent = status.found
                ? (status.watching ? 'Arena Connected' : 'Arena Log Found')
                : 'Arena Offline';
        }
    } catch {
        const dot = document.getElementById('log-status-dot');
        if (dot) dot.className = 'status-dot status-disconnected';
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
function init() {
    initCardPreview();

    // Wire up navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.view));
    });

    // Load initial view
    navigateTo('home');

    // Poll header status
    updateHeaderStatus();
    setInterval(updateHeaderStatus, 10000);
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
