import { api } from '../api.js';

// ─── Color helpers ────────────────────────────────────────────────────────────

const COLOR_BG = {
    W: { bg: 'rgba(245,240,219,0.12)', border: 'rgba(245,240,219,0.25)', text: '#e8e4cc' },
    U: { bg: 'rgba(36,119,176,0.15)', border: 'rgba(36,119,176,0.35)', text: '#7ec8e3' },
    B: { bg: 'rgba(134,80,192,0.13)', border: 'rgba(134,80,192,0.3)', text: '#c0a0e0' },
    R: { bg: 'rgba(208,64,48,0.13)', border: 'rgba(208,64,48,0.3)', text: '#f09070' },
    G: { bg: 'rgba(32,130,60,0.13)', border: 'rgba(32,130,60,0.3)', text: '#80d0a0' },
};
const COLOR_LABEL = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };

function colorPips(colors) {
    return (colors || []).map(c => {
        const s = COLOR_BG[c] || {};
        return `<span class="meta-color-pip" style="background:${s.bg};border:1px solid ${s.border};color:${s.text}" title="${COLOR_LABEL[c]}">${c}</span>`;
    }).join('');
}

function trendIcon(t) {
    if (t === 'up') return '<span class="meta-trend up"   title="Trending up">▲</span>';
    if (t === 'down') return '<span class="meta-trend down" title="Trending down">▼</span>';
    return '<span class="meta-trend stable" title="Stable">●</span>';
}

function wrColor(wr) {
    if (wr >= 60) return '#e07030';
    if (wr >= 55) return '#c89b3c';
    if (wr >= 52) return '#80d0a0';
    if (wr >= 48) return '#b09a6e';
    if (wr >= 44) return '#f09070';
    return '#c06050';
}

// Matchup cell color — green for favored, red for unfavored
function matchupCellStyle(wr) {
    if (wr === 50) return 'background:rgba(160,144,120,0.12);color:var(--text-muted)';
    if (wr > 50) {
        const i = Math.min((wr - 50) / 20, 1);
        return `background:rgba(32,130,60,${(0.08 + i * 0.3).toFixed(2)});color:#80d0a0`;
    }
    const i = Math.min((50 - wr) / 20, 1);
    return `background:rgba(208,64,48,${(0.08 + i * 0.3).toFixed(2)});color:#f09070`;
}

// ─── Tier list rendering ──────────────────────────────────────────────────────

function renderTierList(tiers) {
    return tiers.map(tier => `
    <div class="meta-tier-block">
      <div class="meta-tier-label" style="background:${tier.color}22;border-color:${tier.color}55;color:${tier.color}">
        <span class="meta-tier-letter">${tier.tier}</span>
        <span class="meta-tier-sublabel">${tier.label}</span>
      </div>
      <div class="meta-tier-decks">
        ${tier.decks.map(deck => renderDeckCard(deck, tier.color)).join('')}
      </div>
    </div>
  `).join('');
}

function renderDeckCard(deck, tierColor) {
    const barWidth = Math.min(deck.playRate * 5, 100); // scale: 20% play rate = full bar
    const wr = deck.winRate;
    return `
    <div class="meta-deck-card" data-deck-id="${deck.id}">
      <div class="meta-deck-header">
        <div class="meta-deck-name-row">
          <div class="meta-deck-colors">${colorPips(deck.colors)}</div>
          <div class="meta-deck-name">${deck.name}</div>
          ${trendIcon(deck.trend)}
        </div>
        <div class="meta-deck-stats">
          <div class="meta-stat-block">
            <span class="meta-stat-val" style="color:${tierColor}">${deck.playRate.toFixed(1)}%</span>
            <span class="meta-stat-lbl">Play Rate</span>
          </div>
          <div class="meta-stat-sep"></div>
          <div class="meta-stat-block">
            <span class="meta-stat-val" style="color:${wrColor(wr)}">${wr.toFixed(1)}%</span>
            <span class="meta-stat-lbl">Win Rate</span>
          </div>
        </div>
      </div>
      <div class="meta-play-bar-track">
        <div class="meta-play-bar-fill" style="width:${barWidth}%;background:${tierColor}"></div>
      </div>
      <p class="meta-deck-desc">${deck.description}</p>
      <div class="meta-key-cards">
        ${deck.keyCards.map(k => `<span class="meta-key-card">${k}</span>`).join('')}
      </div>
    </div>
  `;
}

// ─── Matchup matrix rendering ─────────────────────────────────────────────────

function renderMatchupMatrix(tiers, matchups) {
    // Flatten all decks in order
    const allDecks = tiers.flatMap(t => t.decks);

    const headerCells = allDecks.map(d =>
        `<th class="mm-col-hdr" title="${d.name}">
      <div class="mm-col-hdr-inner">
        <div class="mm-col-colors">${colorPips(d.colors)}</div>
        <span class="mm-col-name">${d.name.split(' ').slice(-1)[0]}</span>
      </div>
    </th>`
    ).join('');

    const rows = allDecks.map(rowDeck => {
        const cells = allDecks.map(colDeck => {
            if (rowDeck.id === colDeck.id) {
                return `<td class="mm-cell mm-mirror">—</td>`;
            }
            const wr = matchups[rowDeck.id]?.[colDeck.id] ?? 50;
            return `<td class="mm-cell" style="${matchupCellStyle(wr)}" title="${rowDeck.name} vs ${colDeck.name}: ${wr}%">${wr}%</td>`;
        }).join('');

        return `<tr>
      <th class="mm-row-hdr">
        <div class="mm-row-name">${rowDeck.name}</div>
        <div class="mm-row-colors">${colorPips(rowDeck.colors)}</div>
      </th>
      ${cells}
    </tr>`;
    }).join('');

    return `
    <div class="mm-scroll-wrap">
      <table class="mm-table" role="grid" aria-label="Deck matchup win rates">
        <thead>
          <tr>
            <th class="mm-corner">vs →</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ─── Best/worst matchup summary ───────────────────────────────────────────────

function renderMatchupSummary(tiers, matchups) {
    const allDecks = tiers.flatMap(t => t.decks);
    return allDecks.map(deck => {
        const row = matchups[deck.id] || {};
        const opponents = allDecks.filter(d => d.id !== deck.id);
        const best = opponents.reduce((a, b) => (row[a.id] ?? 50) > (row[b.id] ?? 50) ? a : b);
        const worst = opponents.reduce((a, b) => (row[a.id] ?? 50) < (row[b.id] ?? 50) ? a : b);
        return `
      <div class="ms-row" data-deck-id="${deck.id}">
        <div class="ms-deck-name">${deck.name}</div>
        <div class="ms-matchups">
          <span class="ms-chip favored" title="Best matchup">✓ ${best.name} (${row[best.id]}%)</span>
          <span class="ms-chip unfavored" title="Worst matchup">✗ ${worst.name} (${row[worst.id]}%)</span>
        </div>
      </div>
    `;
    }).join('');
}

// ─── Main render ──────────────────────────────────────────────────────────────

export async function renderMeta(container) {
    container.innerHTML = `
    <div class="meta-layout">
      <div class="meta-loading glass-panel">
        <div class="spinner"></div>
        <span>Loading meta data…</span>
      </div>
    </div>`;

    let data;
    try {
        data = await api.getMeta();
    } catch (err) {
        container.innerHTML = `
      <div class="meta-layout">
        <div class="glass-panel" style="padding:40px;text-align:center;color:var(--text-muted)">
          Could not load meta data. Is the server running?
        </div>
      </div>`;
        return;
    }

    const { tiers, matchups, updatedAt, format } = data;
    const totalPlayRate = tiers.flatMap(t => t.decks).reduce((s, d) => s + d.playRate, 0);

    container.innerHTML = `
    <div class="meta-layout">

      <!-- Page header -->
      <div class="meta-page-header glass-panel">
        <div class="meta-page-title">
          <div class="meta-page-icon">📈</div>
          <div>
            <h1 class="meta-h1">Meta Tracker</h1>
            <p class="meta-subtitle">${format} · Updated ${updatedAt} · ${tiers.flatMap(t => t.decks).length} archetypes tracked</p>
          </div>
        </div>
        <div class="meta-legend">
          <div class="meta-legend-item"><span class="meta-legend-dot" style="background:#e07030"></span>S — Dominant</div>
          <div class="meta-legend-item"><span class="meta-legend-dot" style="background:#c89b3c"></span>A — Strong</div>
          <div class="meta-legend-item"><span class="meta-legend-dot" style="background:#2477b0"></span>B — Viable</div>
          <div class="meta-legend-item"><span class="meta-legend-dot" style="background:#6b5a38"></span>C — Fringe</div>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="meta-tabs">
        <button class="meta-tab active" data-tab="tiers" id="meta-tab-tiers">🏆 Tier List</button>
        <button class="meta-tab" data-tab="matrix"  id="meta-tab-matrix">⚔️ Matchup Matrix</button>
        <button class="meta-tab" data-tab="summary" id="meta-tab-summary">📋 Best &amp; Worst Matchups</button>
      </div>

      <!-- Tier list panel -->
      <div id="meta-panel-tiers" class="meta-panel glass-panel">
        <div class="meta-field-share">
          <span class="meta-field-label">Field representation tracked: <strong style="color:var(--gold)">${totalPlayRate.toFixed(1)}%</strong> of games</span>
        </div>
        ${renderTierList(tiers)}
      </div>

      <!-- Matchup matrix panel -->
      <div id="meta-panel-matrix" class="meta-panel glass-panel" style="display:none">
        <div class="mm-legend">
          <span class="mm-legend-item favored">■ Favored (&gt;50%)</span>
          <span class="mm-legend-item unfavored">■ Unfavored (&lt;50%)</span>
          <span class="mm-legend-item mirror">— Mirror</span>
          <span style="color:var(--text-muted);font-size:12px;margin-left:8px">Read row vs column — number is row deck's win %</span>
        </div>
        ${renderMatchupMatrix(tiers, matchups)}
      </div>

      <!-- Summary panel -->
      <div id="meta-panel-summary" class="meta-panel glass-panel" style="display:none">
        <div class="ms-header">
          <div class="ms-hdr-deck">Deck</div>
          <div class="ms-hdr-matchups">Key Matchups</div>
        </div>
        ${renderMatchupSummary(tiers, matchups)}
      </div>

    </div>`;

    // Tab switching
    container.querySelectorAll('.meta-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.meta-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const id = tab.dataset.tab;
            ['tiers', 'matrix', 'summary'].forEach(p => {
                const el = document.getElementById(`meta-panel-${p}`);
                if (el) el.style.display = p === id ? 'block' : 'none';
            });
        });
    });
}
