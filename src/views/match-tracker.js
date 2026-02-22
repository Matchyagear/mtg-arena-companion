import { api } from '../api.js';
import { showToast } from '../components/toast.js';

const ARCHETYPES = [
    'Aggro', 'Control', 'Midrange', 'Combo', 'Ramp/Stompy', 'Tempo',
    'Burn', 'Tokens', 'Reanimator', 'Tribal', 'Mill', 'Unknown'
];

let matches = [];
let decks = [];
let totalMatches = 0;
let filters = { deckId: '', result: '', format: '' };
let pollInterval = null;

function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

async function loadMatches() {
    try {
        const params = {};
        if (filters.deckId) params.deckId = filters.deckId;
        if (filters.result) params.result = filters.result;
        if (filters.format) params.format = filters.format;

        const data = await api.getMatches(params);
        matches = data.matches;
        totalMatches = data.total;
        renderMatchTable();
    } catch (err) {
        console.error('Failed to load matches:', err);
    }
}

async function loadDecks() {
    try {
        decks = await api.getDecks();
        const deckFilter = document.getElementById('filter-deck');
        if (deckFilter) {
            deckFilter.innerHTML = '<option value="">All Decks</option>' +
                decks.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }
    } catch { }
}

function renderMatchTable() {
    const tbody = document.getElementById('match-tbody');
    if (!tbody) return;

    const countEl = document.getElementById('match-count');
    if (countEl) countEl.textContent = `${totalMatches} matches`;

    if (matches.length === 0) {
        tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <span style="font-size:36px;opacity:0.3">🎮</span>
            <span style="font-size:15px;color:var(--text-secondary)">No matches yet</span>
            <span style="font-size:12px">Play in Arena with Detailed Logs enabled, or add a match manually</span>
          </div>
        </td>
      </tr>`;
        return;
    }

    tbody.innerHTML = matches.map(m => `
    <tr data-match-id="${m.id}">
      <td class="date-cell">${formatDate(m.date)}</td>
      <td>${m.deckName || '—'}</td>
      <td>${m.opponentArchetype || '—'}</td>
      <td>${m.format || '—'}</td>
      <td><span class="badge badge-${m.result}">${m.result?.toUpperCase() || '—'}</span></td>
      <td><span class="source-badge">${m.source === 'arena-log' ? '⚡ Auto' : '✏️ Manual'}</span></td>
      <td>
        <button class="btn btn-icon btn-danger del-match-btn" data-id="${m.id}" title="Delete match">✕</button>
      </td>
    </tr>`).join('');

    tbody.querySelectorAll('.del-match-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await api.deleteMatch(btn.dataset.id);
                await loadMatches();
                showToast('Match deleted', 'info');
            } catch (err) {
                showToast('Delete failed: ' + err.message, 'error');
            }
        });
    });
}

async function addManualMatch(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        deckId: form.querySelector('#manual-deck-id')?.value || null,
        deckName: form.querySelector('#manual-deck-name')?.value || 'Unknown Deck',
        opponentArchetype: form.querySelector('#manual-opponent')?.value || 'Unknown',
        result: form.querySelector('#manual-result')?.value,
        format: form.querySelector('#manual-format')?.value || 'standard',
        notes: form.querySelector('#manual-notes')?.value || '',
    };

    if (!data.result) { showToast('Please select a result', 'info'); return; }

    try {
        await api.addMatch(data);
        await loadMatches();
        showToast('Match recorded!', 'success');
        form.reset();
        form.querySelector('#manual-result').value = '';
        // Refill deck dropdown after reset
        loadDecks();
    } catch (err) {
        showToast('Failed to add match: ' + err.message, 'error');
    }
}

function startPolling() {
    pollInterval = setInterval(loadMatches, 5000); // Check for new log-tracked matches every 5s
}

export function stopPolling() {
    clearInterval(pollInterval);
}

async function updateLogStatus() {
    try {
        const status = await api.getLogStatus();
        const dot = document.getElementById('log-status-badge');
        const text = document.getElementById('log-status-info');
        if (dot) {
            dot.className = `status-dot ${status.found && status.watching ? 'status-connected' : 'status-disconnected'}`;
        }
        if (text) {
            if (status.found && status.watching) {
                text.textContent = `✅ Watching Arena log · ${status.matchesFound} matches captured`;
                text.style.color = 'var(--teal)';
            } else {
                text.textContent = `⚠️ ${status.error || 'Log file not found'}`;
                text.style.color = 'var(--red-fire)';
            }
        }
    } catch { }
}

export async function renderMatchTracker(container) {
    container.innerHTML = `
    <div class="match-tracker-layout">
      <!-- Manual Entry Form -->
      <div class="glass-panel match-form-panel">
        <div class="panel-header">
          <span class="panel-title">Log Match</span>
        </div>
        <div class="match-form-inner">
          <!-- Arena log status -->
          <div style="padding:12px;border-radius:var(--radius-md);background:var(--bg-input);border:1px solid var(--border-subtle)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div id="log-status-badge" class="status-dot status-unknown"></div>
              <span style="font-size:12px;font-weight:600;color:var(--text-secondary)">Arena Log Status</span>
            </div>
            <div id="log-status-info" style="font-size:12px;color:var(--text-muted)">Checking…</div>
          </div>

          <div style="font-size:12px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">
            Manual Entry
          </div>

          <form id="manual-match-form" style="display:flex;flex-direction:column;gap:12px">
            <div class="form-group">
              <label class="form-label" for="manual-deck-id">Deck (optional)</label>
              <select id="manual-deck-id" class="select">
                <option value="">— Custom Deck Name —</option>
              </select>
            </div>

            <div class="form-group" id="custom-deck-name-group">
              <label class="form-label" for="manual-deck-name">Deck Name</label>
              <input id="manual-deck-name" class="input" type="text" placeholder="e.g. Esper Midrange" />
            </div>

            <div class="form-group">
              <label class="form-label" for="manual-opponent">Opponent Archetype</label>
              <select id="manual-opponent" class="select">
                ${ARCHETYPES.map(a => `<option value="${a}">${a}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="manual-result">Result *</label>
              <select id="manual-result" class="select" required>
                <option value="">Select result…</option>
                <option value="win">🏆 Win</option>
                <option value="loss">💀 Loss</option>
                <option value="draw">🤝 Draw</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="manual-format">Format</label>
              <select id="manual-format" class="select">
                <option value="standard">Standard</option>
                <option value="draft">Draft / Limited</option>
                <option value="historic">Historic</option>
                <option value="explorer">Explorer</option>
                <option value="alchemy">Alchemy</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="manual-notes">Notes</label>
              <input id="manual-notes" class="input" type="text" placeholder="e.g. Opponent was on burn…" />
            </div>

            <button type="submit" class="btn btn-primary">+ Add Match</button>
          </form>
        </div>
      </div>

      <!-- Match List -->
      <div class="glass-panel match-list-panel">
        <div class="panel-header">
          <span class="panel-title">Match History</span>
          <span id="match-count" style="font-size:12px;color:var(--text-muted)"></span>
        </div>
        <div class="match-filters">
          <select id="filter-deck" class="select">
            <option value="">All Decks</option>
          </select>
          <select id="filter-result" class="select">
            <option value="">All Results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="draw">Draws</option>
          </select>
          <select id="filter-format" class="select">
            <option value="">All Formats</option>
            <option value="standard">Standard</option>
            <option value="draft">Draft</option>
            <option value="historic">Historic</option>
            <option value="explorer">Explorer</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="refresh-matches-btn">🔄 Refresh</button>
        </div>
        <div class="match-table-wrapper">
          <table class="match-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Deck</th>
                <th>Opponent</th>
                <th>Format</th>
                <th>Result</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="match-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>`;

    // Event listeners
    document.getElementById('manual-match-form')?.addEventListener('submit', addManualMatch);
    document.getElementById('refresh-matches-btn')?.addEventListener('click', loadMatches);

    // Sync deck name field when selecting a saved deck
    document.getElementById('manual-deck-id')?.addEventListener('change', (e) => {
        const selected = decks.find(d => d.id === e.target.value);
        const nameInput = document.getElementById('manual-deck-name');
        if (nameInput) nameInput.value = selected ? selected.name : '';
    });

    document.getElementById('filter-deck')?.addEventListener('change', e => {
        filters.deckId = e.target.value;
        loadMatches();
    });
    document.getElementById('filter-result')?.addEventListener('change', e => {
        filters.result = e.target.value;
        loadMatches();
    });
    document.getElementById('filter-format')?.addEventListener('change', e => {
        filters.format = e.target.value;
        loadMatches();
    });

    await loadDecks();
    await loadMatches();
    await updateLogStatus();
    startPolling();
}
