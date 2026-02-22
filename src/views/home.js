import { api } from '../api.js';
import { renderMana, MANA_COLORS } from '../components/mana-symbols.js';

// ─── Archetype inference ──────────────────────────────────────────────────────

const ARCHETYPE_RULES = [
  { match: c => c.colors?.includes('R') && c.cmc <= 2 && c.type_line?.includes('Creature'), archetypes: ['Red Aggro', 'Boros Aggro', 'Rakdos Aggro'] },
  { match: c => c.oracle_text?.toLowerCase().includes('deals') && c.oracle_text?.toLowerCase().includes('damage') && c.colors?.includes('R'), archetypes: ['Red Burn', 'Izzet Spell', 'Gruul Aggro'] },
  { match: c => (c.type_line?.includes('Instant') || c.type_line?.includes('Sorcery')) && (c.oracle_text?.toLowerCase().includes('counter') || c.oracle_text?.toLowerCase().includes('destroy') || c.oracle_text?.toLowerCase().includes('exile')), archetypes: ['Azorius Control', 'Dimir Control', 'Esper Control'] },
  { match: c => c.type_line?.includes('Creature') && c.oracle_text?.toLowerCase().includes('flying') && c.colors?.includes('U'), archetypes: ['Azorius Tempo', 'Dimir Tempo', 'Azorius Control'] },
  { match: c => c.cmc >= 3 && c.cmc <= 5 && c.type_line?.includes('Creature') && c.colors?.includes('G'), archetypes: ['Golgari Midrange', 'Jund Midrange', 'Sultai Midrange'] },
  { match: c => c.type_line?.includes('Planeswalker'), archetypes: ['Midrange', 'Control', 'Superfriends'] },
  { match: c => c.oracle_text?.toLowerCase().includes('add') && c.oracle_text?.toLowerCase().includes('mana') && c.colors?.includes('G'), archetypes: ['Mono-Green Ramp', 'Domain Ramp', 'Atraxa Ramp'] },
  { match: c => c.cmc >= 6 && c.type_line?.includes('Creature'), archetypes: ['Ramp', 'Reanimator', 'Big Stuff'] },
  { match: c => c.oracle_text?.toLowerCase().includes('token') || c.oracle_text?.toLowerCase().includes('create'), archetypes: ['Tokens', 'Boros Convoke', 'Selesnya Tokens'] },
  { match: c => c.oracle_text?.toLowerCase().includes('graveyard'), archetypes: ['Reanimator', 'Graveyard Synergy', 'Dredge'] },
  { match: c => ['Vampire', 'Zombie', 'Elf', 'Goblin', 'Merfolk', 'Dragon', 'Pirate', 'Dinosaur'].some(t => c.type_line?.includes(t)), archetypes: ['Tribal'] },
  { match: c => c.colors?.includes('W') && c.cmc <= 2 && c.type_line?.includes('Creature'), archetypes: ['Mono-White Aggro', 'Azorius Aggro', 'Orzhov Midrange'] },
  { match: c => c.oracle_text?.toLowerCase().includes('lifelink') || (c.oracle_text?.toLowerCase().includes('gain') && c.oracle_text?.toLowerCase().includes('life')), archetypes: ['Life Gain', 'Orzhov Control', 'White Weenie'] },
  { match: c => c.type_line?.includes('Artifact'), archetypes: ['Artifact Synergy', 'Affinity', 'Ensoul'] },
  { match: c => c.oracle_text?.toLowerCase().includes('copy') || c.oracle_text?.toLowerCase().includes('storm'), archetypes: ['Combo', 'Izzet Spells', 'Temur Cascade'] },
];

function inferArchetypes(card) {
  if (!card) return [];
  const seen = new Set();
  const results = [];
  for (const rule of ARCHETYPE_RULES) {
    if (rule.match(card)) {
      for (const arch of rule.archetypes) {
        if (arch && !seen.has(arch)) { seen.add(arch); results.push(arch); }
      }
    }
    if (results.length >= 5) break;
  }
  return results.slice(0, 5);
}

// ─── ELI5 Generator ───────────────────────────────────────────────────────────

const KEYWORD_EXPLAIN = {
  'Flying': 'It can only be blocked by creatures that also fly or have reach.',
  'Trample': "If it's blocked, extra damage tramples through to your opponent.",
  'Haste': 'It can attack the same turn it enters — no waiting.',
  'Vigilance': "It can attack without tapping, so it can also block on your opponent's turn.",
  'Deathtouch': 'Any amount of damage it deals is lethal — it kills anything it touches.',
  'Lifelink': 'Every point of damage it deals also heals you.',
  'Flash': "You can cast it any time, even during your opponent's turn.",
  'First strike': 'It deals combat damage before normal creatures — often killing them first.',
  'Double strike': 'It deals damage twice in combat.',
  'Reach': 'It can block flying creatures even without flying.',
  'Indestructible': 'Cannot be destroyed by damage or "destroy" effects.',
  'Hexproof': "Your opponent's spells and abilities cannot target it.",
  'Ward': 'If your opponent targets it, they must pay extra or the effect fails.',
  'Menace': 'Must be blocked by two or more creatures at once.',
  'Prowess': 'Gets temporarily bigger whenever you cast a non-creature spell.',
  'Kicker': 'Pay extra mana when casting for a stronger effect.',
  'Convoke': 'Tap your own creatures to help pay the casting cost.',
  'Delve': 'Exile cards from your graveyard to reduce the mana cost.',
  'Escape': 'Can be recast from your graveyard by exiling other cards there.',
  'Foretell': 'Pay 2 to hide it face-down, then cast it cheaper later.',
  'Enlist': 'Tap another attacker when attacking to temporarily boost its power.',
  'Undying': 'When it dies, it comes back once with a +1/+1 counter.',
  'Persist': 'When it dies, it comes back once with a −1/−1 counter.',
  'Cascade': 'When cast, automatically cast any matching cheaper card from the top of your deck for free.',
  'Storm': 'Copies this spell once per spell already cast this turn.',
  'Cycling': 'Pay a small cost to discard and draw a card if you have no use for it now.',
};

function generateELI5(card) {
  const oracle = (card.oracle_text || '').toLowerCase();
  const type = card.type_line || '';
  const kws = card.keywords || [];
  const parts = [];

  // Type intro
  if (type.includes('Planeswalker')) {
    parts.push(`Powerful ally that stays on the battlefield. Starts with ${card.loyalty ?? '?'} loyalty and uses one ability each turn.`);
  } else if (type.includes('Land')) {
    parts.push(`A land — tap it for mana to cast spells. Free to play, one per turn.`);
  } else if (type.includes('Creature')) {
    const sub = type.split('—')[1]?.trim() || 'Creature';
    const pt = card.power != null ? `${card.power}/${card.toughness}` : '?/?';
    parts.push(`A ${pt} ${sub}. The first number (${card.power ?? '?'}) is how much damage it deals, the second (${card.toughness ?? '?'}) is how much damage it can take before dying.`);
  } else if (type.includes('Instant')) {
    parts.push(`An instant — cast it any time, even on your opponent's turn or in response to their spells.`);
  } else if (type.includes('Sorcery')) {
    parts.push(`A sorcery — one-time effect you can only cast during your own main phase.`);
  } else if (type.includes('Enchantment')) {
    parts.push(`An enchantment — stays in play and continuously affects the game.`);
  } else if (type.includes('Artifact')) {
    parts.push(`An artifact — a permanent that stays on the battlefield. Most can be played in any deck.`);
  }

  // Keywords (max 2)
  kws.filter(k => KEYWORD_EXPLAIN[k]).slice(0, 2).forEach(k => parts.push(KEYWORD_EXPLAIN[k]));

  // Oracle patterns
  if (/deals \w+ damage/.test(oracle)) {
    const m = oracle.match(/deals (\w+) damage/);
    const who = oracle.includes('each creature') ? 'all creatures'
      : oracle.includes('any target') ? 'any target you choose'
        : oracle.includes('target creature') ? 'a creature'
          : oracle.includes('each opponent') || oracle.includes('target player') ? 'your opponent'
            : 'a target';
    parts.push(`Deals ${m ? m[1] : 'some'} damage to ${who}.`);
  }
  if (oracle.includes('draw') && oracle.includes('card')) {
    const m = oracle.match(/draw (a|\w+) cards?/);
    if (m) parts.push(`Lets you draw ${m[1] === 'a' ? 'a card' : m[1] + ' cards'} — keeps your hand stocked.`);
  }
  if (oracle.includes('counter target')) {
    parts.push(`Cancels a spell your opponent is casting — it never happens.`);
  }
  if (oracle.includes('destroy target')) {
    const what = oracle.includes('creature') ? 'creature' : oracle.includes('artifact') ? 'artifact' : oracle.includes('enchantment') ? 'enchantment' : 'permanent';
    parts.push(`Destroys a target ${what} — sends it to the graveyard.`);
  }
  if (oracle.includes('exile target') || (oracle.includes('exile') && oracle.includes('target'))) {
    parts.push(`Exiles the target — unlike destroying, exiled cards are permanently removed from the game.`);
  }
  if (oracle.includes('search your library')) {
    parts.push(`Lets you search your deck for a specific card.`);
  }
  if (oracle.includes('token')) {
    parts.push(`Creates extra creature tokens to flood the board.`);
  }
  if (oracle.includes('+1/+1 counter')) {
    parts.push(`Puts +1/+1 counters on creatures, permanently making them bigger.`);
  }
  if (oracle.includes('gain') && oracle.includes('life')) {
    const m = oracle.match(/gain (\d+) life/);
    parts.push(m ? `You gain ${m[1]} life — helps you survive aggro.` : `Gives you extra life.`);
  }
  if (oracle.includes('return') && oracle.includes('from your graveyard')) {
    parts.push(`Retrieves a card from your graveyard — great for value and recursion.`);
  }
  if (oracle.includes('whenever') || oracle.includes('at the beginning of')) {
    parts.push(`Has a triggered ability that fires automatically when a game event occurs.`);
  }

  if (parts.length === 0) return null;
  return parts.slice(0, 4).join(' ');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_NAMES = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
const RARITY_ICON = { common: '●', uncommon: '◆', rare: '★', mythic: '✦' };
const RARITY_COLOR = { common: '#9ca3af', uncommon: '#94a3b8', rare: '#fbbf24', mythic: '#f97316' };

function colorDisplay(colors) {
  if (!colors?.length) return '<span style="color:var(--text-muted)">Colorless</span>';
  return colors.map(c => `<span style="color:${MANA_COLORS[c]};font-weight:600">${COLOR_NAMES[c] || c}</span>`).join(' / ');
}

// ─── State ────────────────────────────────────────────────────────────────────

let searchTimeout = null;
let currentResults = [];
let savedDecks = [];
let recentSearches = JSON.parse(localStorage.getItem('mtg-recent-searches') || '[]');

function saveRecentSearch(name) {
  recentSearches = [name, ...recentSearches.filter(n => n !== name)].slice(0, 8);
  localStorage.setItem('mtg-recent-searches', JSON.stringify(recentSearches));
}

// ─── Dropdown portal ──────────────────────────────────────────────────────────

function getDropdownEl() {
  let dd = document.getElementById('home-search-dropdown');
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'home-search-dropdown';
    dd.className = 'home-search-dropdown';
    dd.setAttribute('role', 'listbox');
    document.body.appendChild(dd);
  }
  return dd;
}

function positionDropdown() {
  const bar = document.getElementById('home-search-bar');
  const dd = getDropdownEl();
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  dd.style.top = (rect.bottom + 6) + 'px';
  dd.style.left = rect.left + 'px';
  dd.style.width = rect.width + 'px';
}

function renderDropdown(cards) {
  const dd = getDropdownEl();
  positionDropdown();

  if (!cards?.length) {
    dd.innerHTML = '<div class="home-dd-empty">No cards found</div>';
    dd.classList.add('visible');
    return;
  }

  dd.innerHTML = cards.map((card, i) => {
    const mana = renderMana(card.mana_cost);
    const rc = RARITY_COLOR[card.rarity] || '#9ca3af';
    const type = (card.type_line || '').split('—')[0].trim();
    return `<div class="home-dd-item" data-idx="${i}" role="option">
      <div class="home-dd-mana">${mana}</div>
      <div class="home-dd-name">${card.name}</div>
      <div class="home-dd-type">${type}</div>
      <span style="color:${rc};font-size:13px">${RARITY_ICON[card.rarity] || '●'}</span>
    </div>`;
  }).join('');

  dd.classList.add('visible');
  dd.querySelectorAll('.home-dd-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      selectCard(cards[parseInt(item.dataset.idx)]);
    });
  });
}

function hideDropdown() {
  const dd = document.getElementById('home-search-dropdown');
  if (dd) dd.classList.remove('visible');
}

// ─── Card detail ──────────────────────────────────────────────────────────────

function selectCard(card) {
  saveRecentSearch(card.name);
  const input = document.getElementById('home-search-input');
  if (input) input.value = card.name;
  hideDropdown();
  renderCardDetail(card);
  renderRecentSearches();
}

function renderCardDetail(card) {
  const panel = document.getElementById('card-detail-panel');
  if (!panel) return;

  const imageUri = card.image_uris?.large || card.image_uris?.normal || null;
  const manaHtml = renderMana(card.mana_cost);
  const archetypes = inferArchetypes(card);
  const myDecks = savedDecks.filter(d => d.cards?.some(c => c.id === card.id || c.name === card.name));
  const eli5 = generateELI5(card);

  const legality = [
    { fmt: 'Standard', status: card.legalities?.standard },
    { fmt: 'Historic', status: card.legalities?.historic },
    { fmt: 'Explorer', status: card.legalities?.explorer },
    { fmt: 'Pioneer', status: card.legalities?.pioneer },
  ];

  const typeParts = (card.type_line || '').split('—');
  const mainType = typeParts[0]?.trim() || '';
  const subType = typeParts[1]?.trim() || '';

  const ptBadge = card.power
    ? `<div class="cd-pt">${card.power} <span style="opacity:0.4">/</span> ${card.toughness}</div>`
    : card.loyalty
      ? `<div class="cd-pt">⬡ ${card.loyalty}</div>`
      : '';

  panel.innerHTML = `
    <div class="cd-layout">
      <!-- Card art -->
      <div class="cd-art-col">
        ${imageUri
      ? `<img class="cd-art" src="${imageUri}" alt="${card.name}">`
      : `<div class="cd-art-placeholder">🃏<div style="font-size:14px;color:var(--text-muted);margin-top:8px">No image</div></div>`}
      </div>

      <!-- Info panel -->
      <div class="cd-body">

        <!-- Card header -->
        <div class="cd-header">
          <div>
            <h2 class="cd-name">${card.name}</h2>
            <div class="cd-type-line">
              <span class="cd-main-type">${mainType}</span>
              ${subType ? `<span class="cd-sub-type">— ${subType}</span>` : ''}
            </div>
          </div>
          <div class="cd-header-right">
            <div class="cd-mana-cost">${manaHtml}</div>
            ${ptBadge}
          </div>
        </div>

        <!-- Oracle text -->
        <div class="cd-oracle">${(card.oracle_text || 'No rules text.').replace(/\n/g, '<br>')}</div>

        <!-- ELI5 -->
        ${eli5 ? `
        <div class="cd-eli5">
          <div class="cd-eli5-header">💡 In plain English</div>
          <p class="cd-eli5-body">${eli5}</p>
        </div>` : ''}

        <!-- Metadata -->
        <div class="cd-meta">
          <div class="cd-meta-chip">
            <span class="cd-meta-lbl">Set</span>
            <span class="cd-meta-val">${card.set_name || card.set?.toUpperCase() || '—'}</span>
          </div>
          <div class="cd-meta-chip">
            <span class="cd-meta-lbl">Rarity</span>
            <span class="cd-meta-val" style="color:${RARITY_COLOR[card.rarity] || '#9ca3af'}">${card.rarity ? card.rarity[0].toUpperCase() + card.rarity.slice(1) : '—'}</span>
          </div>
          <div class="cd-meta-chip">
            <span class="cd-meta-lbl">Colors</span>
            <span class="cd-meta-val">${colorDisplay(card.colors)}</span>
          </div>
          <div class="cd-meta-chip">
            <span class="cd-meta-lbl">CMC</span>
            <span class="cd-meta-val">${card.cmc ?? '—'}</span>
          </div>
        </div>

        <!-- Legality -->
        <div class="cd-legality">
          ${legality.map(e => `
            <span class="cd-legal-chip ${e.status === 'legal' ? 'legal' : 'not-legal'}">
              ${e.status === 'legal' ? '✓' : '✗'} ${e.fmt}
            </span>`).join('')}
        </div>

        <!-- Deck fits -->
        <div class="cd-fits">
          <div class="cd-fit-col">
            <div class="cd-fit-hdr">📚 Your Decks</div>
            <div class="cd-fit-pills">
              ${myDecks.length > 0
      ? myDecks.map(d => {
        const qty = d.cards?.find(c => c.id === card.id || c.name === card.name)?.qty ?? '?';
        return `<span class="cd-pill your-deck"><b>${qty}×</b> ${d.name} <small>${d.format}</small></span>`;
      }).join('')
      : '<span class="cd-fit-none">Not in any saved deck</span>'}
            </div>
          </div>
          <div class="cd-fit-col">
            <div class="cd-fit-hdr">🏆 Often Seen In</div>
            <div class="cd-fit-pills">
              ${archetypes.length > 0
      ? archetypes.map(a => `<span class="cd-pill meta">${a}</span>`).join('')
      : '<span class="cd-fit-none">No data</span>'}
            </div>
          </div>
        </div>

      </div>
    </div>`;
}

// ─── Recent searches ──────────────────────────────────────────────────────────

function renderRecentSearches() {
  const el = document.getElementById('recent-searches');
  if (!el) return;
  if (!recentSearches.length) {
    el.innerHTML = '<span style="color:var(--text-muted);font-size:12px">No recent searches</span>';
    return;
  }
  el.innerHTML = recentSearches.map(name =>
    `<button class="recent-chip" data-name="${name}">${name}</button>`
  ).join('');
  el.querySelectorAll('.recent-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('home-search-input');
      if (input) { input.value = btn.dataset.name; input.focus(); }
      doSearch(btn.dataset.name);
    });
  });
}

// ─── Quick stats ──────────────────────────────────────────────────────────────

async function renderQuickStats() {
  const el = document.getElementById('home-quick-stats');
  if (!el) return;
  try {
    const stats = await api.getStats();
    const si = stats.streakType === 'win' ? '🔥' : stats.streakType === 'loss' ? '❄️' : '';
    el.innerHTML = `
      <div class="quick-stat"><span class="qs-value">${stats.total}</span><span class="qs-label">Games</span></div>
      <div class="quick-stat-divider"></div>
      <div class="quick-stat"><span class="qs-value" style="color:var(--teal)">${stats.wins}</span><span class="qs-label">Wins</span></div>
      <div class="quick-stat-divider"></div>
      <div class="quick-stat"><span class="qs-value" style="color:var(--red-fire)">${stats.losses}</span><span class="qs-label">Losses</span></div>
      <div class="quick-stat-divider"></div>
      <div class="quick-stat"><span class="qs-value" style="color:var(--purple)">${stats.winRate}%</span><span class="qs-label">Win Rate</span></div>
      ${stats.streak > 0 ? `
      <div class="quick-stat-divider"></div>
      <div class="quick-stat"><span class="qs-value">${si} ${stats.streak}</span><span class="qs-label">${stats.streakType === 'win' ? 'Win Streak' : 'Loss Streak'}</span></div>` : ''}`;
  } catch {
    el.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Play some matches to see your stats here!</span>';
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function doSearch(query) {
  if (!query || query.trim().length < 2) { hideDropdown(); return; }
  try {
    const data = await api.searchCards({ q: query.trim() });
    currentResults = data.results;
    renderDropdown(currentResults);
  } catch (err) {
    console.error('Home search error:', err);
  }
}

// ─── Main render ──────────────────────────────────────────────────────────────

export async function renderHome(container) {
  try { savedDecks = await api.getDecks(); } catch { }

  container.innerHTML = `
    <div class="home-layout">

      <section class="home-hero glass-panel">
        <div class="home-hero-inner">
          <div class="home-hero-title">
            <span class="home-hero-gem">◆</span>
            <h1 class="home-hero-heading">Quick Card Lookup</h1>
          </div>
          <p class="home-hero-sub">Look up any Standard card mid-match — oracle text, plain English summary, deck fits, and archetypes.</p>

          <div class="home-search-wrap">
            <div class="home-search-bar" id="home-search-bar">
              <span class="home-search-icon">🔍</span>
              <input id="home-search-input" class="home-search-input" type="search"
                placeholder="Type a card name…" autocomplete="off" spellcheck="false" />
              <span id="home-search-spinner" class="spinner" style="display:none;margin-right:10px"></span>
            </div>
          </div>

          <div class="home-recent">
            <span class="home-recent-label">Recent:</span>
            <div id="recent-searches" class="recent-searches-row"></div>
          </div>
        </div>
      </section>

      <section id="card-detail-panel" class="home-card-detail glass-panel">
        <div class="cd-empty">
          <div style="font-size:64px;opacity:0.1">🃏</div>
          <div style="font-size:18px;font-weight:600;color:var(--text-secondary);margin-top:12px">Search for a card above</div>
          <div style="font-size:14px;color:var(--text-muted);margin-top:6px">See oracle text, a plain-English summary, and which decks run it</div>
        </div>
      </section>

      <section class="home-stats-bar glass-panel">
        <div class="home-stats-bar-label"><span>📊</span> Your Stats</div>
        <div id="home-quick-stats" class="home-qs-row"><div class="spinner"></div></div>
        <div class="home-stats-bar-actions">
          <button class="btn btn-ghost btn-sm" id="home-go-stats">View Full Stats →</button>
        </div>
      </section>

    </div>`;

  // Setup portal dropdown
  const ddPortal = getDropdownEl();
  ddPortal.innerHTML = '';
  ddPortal.classList.remove('visible');

  // Search input wiring
  const input = document.getElementById('home-search-input');
  window.addEventListener('resize', positionDropdown);

  input?.addEventListener('input', e => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    if (val.length < 2) { hideDropdown(); return; }
    const sp = document.getElementById('home-search-spinner');
    if (sp) sp.style.display = 'block';
    searchTimeout = setTimeout(async () => {
      await doSearch(val);
      if (sp) sp.style.display = 'none';
    }, 200);
  });

  input?.addEventListener('keydown', e => {
    const dd = getDropdownEl();
    const items = dd.querySelectorAll('.home-dd-item');
    if (!items.length) return;
    const cur = dd.querySelector('.home-dd-item.focused');
    const idx = cur ? [...items].indexOf(cur) : -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)];
      cur?.classList.remove('focused'); next.classList.add('focused');
      next.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[idx > 0 ? idx - 1 : 0];
      cur?.classList.remove('focused'); prev.classList.add('focused');
      prev.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const focused = dd.querySelector('.home-dd-item.focused');
      const pick = focused ? currentResults[parseInt(focused.dataset.idx)] : currentResults[0];
      if (pick) selectCard(pick);
    } else if (e.key === 'Escape') {
      hideDropdown();
    }
  });

  input?.addEventListener('blur', () => setTimeout(hideDropdown, 150));
  input?.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && currentResults.length > 0) {
      positionDropdown(); renderDropdown(currentResults);
    }
  });

  document.getElementById('home-go-stats')?.addEventListener('click', () => {
    document.querySelector('[data-view="stats"]')?.click();
  });

  renderRecentSearches();
  await renderQuickStats();
  setTimeout(() => input?.focus(), 50);
}
