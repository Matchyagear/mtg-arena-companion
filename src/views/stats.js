import { api } from '../api.js';

let stats = null;
let charts = {};

function pct(wins, total) {
    return total > 0 ? Math.round((wins / total) * 100) : 0;
}

// ─── Canvas Charts ────────────────────────────────────────────────────────────

function drawBarChart(canvas, labels, values, colors) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = 160;
    ctx.clearRect(0, 0, W, H);

    if (!values.length) return;
    const max = Math.max(...values, 1);
    const barW = Math.min(40, (W - 32) / labels.length - 8);
    const gap = (W - 32) / labels.length;

    labels.forEach((label, i) => {
        const x = 16 + i * gap + (gap - barW) / 2;
        const barH = Math.round((values[i] / max) * (H - 40));
        const y = H - 24 - barH;

        // Bar
        const grad = ctx.createLinearGradient(0, y, 0, H - 24);
        grad.addColorStop(0, colors[i % colors.length]);
        grad.addColorStop(1, colors[i % colors.length] + '55');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();

        // Value
        if (values[i] > 0) {
            ctx.fillStyle = '#f0f2ff';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(values[i], x + barW / 2, y - 4);
        }

        // Label
        ctx.fillStyle = '#5a6290';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        const short = label.length > 8 ? label.slice(0, 7) + '…' : label;
        ctx.fillText(short, x + barW / 2, H - 6);
    });
}

function drawLineChart(canvas, labels, values, color) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = 160;
    ctx.clearRect(0, 0, W, H);

    if (!values.length) return;
    const max = Math.max(...values, 1);
    const padX = 24;
    const padY = 16;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2 - 16;

    const pts = values.map((v, i) => ({
        x: padX + (i / Math.max(values.length - 1, 1)) * plotW,
        y: padY + plotH - (v / max) * plotH,
    }));

    // Gradient fill
    if (pts.length > 1) {
        const grad = ctx.createLinearGradient(0, padY, 0, padY + plotH);
        grad.addColorStop(0, color + '40');
        grad.addColorStop(1, color + '00');
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, padY + plotH);
        ctx.lineTo(pts[0].x, padY + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Dots
    pts.forEach(p => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // x-axis labels
    if (labels.length > 0 && labels.length <= 10) {
        ctx.fillStyle = '#5a6290';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        pts.forEach((p, i) => {
            const short = (labels[i] || '').slice(5); // MM-DD from YYYY-MM-DD
            ctx.fillText(short, p.x, H - 2);
        });
    }
}

function drawPieChart(canvas, labels, values, colors) {
    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.offsetWidth, 120);
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    const total = values.reduce((s, v) => s + v, 0);
    if (total === 0) return;

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.42;
    let angle = -Math.PI / 2;

    values.forEach((v, i) => {
        const slice = (v / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + slice);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        angle += slice;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#13162b';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#f0f2ff';
    ctx.font = '700 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy);
}

// ─── Render ───────────────────────────────────────────────────────────────────

async function loadAndRender() {
    try {
        stats = await api.getStats();
        renderHeroStats();
        renderDeckChart();
        renderOpponentChart();
        renderTrendChart();
        renderWinLossChart();
    } catch (err) {
        console.error('Stats load error:', err);
    }
}

function renderHeroStats() {
    const streakLabel = stats.streakType === 'win'
        ? `🔥 ${stats.streak}-game win streak`
        : stats.streakType === 'loss'
            ? `❄️ ${stats.streak}-game loss streak`
            : 'No matches yet';

    document.getElementById('stat-wins')?.querySelector('.stat-value') &&
        (document.getElementById('stat-wins').querySelector('.stat-value').textContent = stats.wins);
    document.getElementById('stat-losses')?.querySelector('.stat-value') &&
        (document.getElementById('stat-losses').querySelector('.stat-value').textContent = stats.losses);
    document.getElementById('stat-rate')?.querySelector('.stat-value') &&
        (document.getElementById('stat-rate').querySelector('.stat-value').textContent = stats.winRate + '%');
    document.getElementById('stat-streak')?.querySelector('.stat-value') &&
        (document.getElementById('stat-streak').querySelector('.stat-value').textContent = stats.streak || 0);

    const streakEl = document.getElementById('stat-streak')?.querySelector('.stat-sublabel');
    if (streakEl) streakEl.textContent = streakLabel;

    const totalEl = document.getElementById('stat-streak')?.querySelector('.stat-label');
    if (totalEl) totalEl.textContent = `${stats.total} total games`;
}

function renderDeckChart() {
    const canvas = document.getElementById('deck-chart');
    if (!canvas || !stats?.byDeck?.length) return;
    const top = stats.byDeck
        .map(d => ({ ...d, wr: pct(d.wins, d.wins + d.losses + d.draws) }))
        .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
        .slice(0, 8);
    drawBarChart(canvas, top.map(d => d.name), top.map(d => d.wr), ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95']);
}

function renderOpponentChart() {
    const canvas = document.getElementById('opponent-chart');
    if (!canvas || !stats?.byOpponent?.length) return;
    const top = stats.byOpponent
        .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
        .slice(0, 8);
    drawBarChart(canvas, top.map(d => d.archetype), top.map(d => pct(d.wins, d.wins + d.losses + d.draws)), ['#2dd4bf', '#14b8a6', '#0d9488']);
}

function renderTrendChart() {
    const canvas = document.getElementById('trend-chart');
    if (!canvas || !stats?.byDay?.length) return;
    const recent = stats.byDay.slice(-14);
    drawLineChart(canvas, recent.map(d => d.date), recent.map(d => pct(d.wins, d.wins + d.losses)), '#8b5cf6');
}

function renderWinLossChart() {
    const canvas = document.getElementById('winloss-pie');
    if (!canvas) return;
    drawPieChart(
        canvas,
        ['Wins', 'Losses', 'Draws'],
        [stats.wins, stats.losses, stats.draws],
        ['#2dd4bf', '#f87171', '#fbbf24']
    );
}

export async function renderStats(container) {
    container.innerHTML = `
    <div class="stats-layout">
      <!-- Hero stats -->
      <div class="stats-hero">
        <div class="stat-card wins" id="stat-wins">
          <div class="stat-value">0</div>
          <div class="stat-label">Wins</div>
        </div>
        <div class="stat-card losses" id="stat-losses">
          <div class="stat-value">0</div>
          <div class="stat-label">Losses</div>
        </div>
        <div class="stat-card rate" id="stat-rate">
          <div class="stat-value">0%</div>
          <div class="stat-label">Win Rate</div>
        </div>
        <div class="stat-card streak" id="stat-streak">
          <div class="stat-value">—</div>
          <div class="stat-label">Total games: 0</div>
          <div class="stat-sublabel">No matches yet</div>
        </div>
      </div>

      <!-- Charts row 1 -->
      <div class="stats-grid">
        <div class="glass-panel" style="padding:20px">
          <div class="chart-title">Win Rate by Deck (%)</div>
          <canvas id="deck-chart" style="width:100%"></canvas>
          <p id="deck-chart-empty" style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:8px"></p>
        </div>
        <div class="glass-panel" style="padding:20px">
          <div class="chart-title">Win Rate vs Archetypes (%)</div>
          <canvas id="opponent-chart" style="width:100%"></canvas>
        </div>
      </div>

      <!-- Charts row 2 -->
      <div class="stats-grid">
        <div class="glass-panel" style="padding:20px">
          <div class="chart-title">Win Rate Over Time (%)</div>
          <canvas id="trend-chart" style="width:100%"></canvas>
        </div>
        <div class="glass-panel" style="padding:20px;display:flex;gap:24px;align-items:center">
          <canvas id="winloss-pie" style="flex-shrink:0"></canvas>
          <div id="winloss-legend" style="display:flex;flex-direction:column;gap:10px;flex:1"></div>
        </div>
      </div>
    </div>`;

    await loadAndRender();

    // Win/loss legend
    if (stats) {
        document.getElementById('winloss-legend').innerHTML = [
            { label: 'Wins', color: '#2dd4bf', val: stats.wins },
            { label: 'Losses', color: '#f87171', val: stats.losses },
            { label: 'Draws', color: '#fbbf24', val: stats.draws },
        ].map(item => `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:12px;height:12px;border-radius:50%;background:${item.color};flex-shrink:0"></div>
        <span style="font-size:13px;color:var(--text-secondary)">${item.label}</span>
        <span style="font-size:16px;font-weight:700;color:var(--text-primary);margin-left:auto">${item.val}</span>
      </div>`).join('');
    }
}
