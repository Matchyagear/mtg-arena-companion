import { api } from '../api.js';
import { renderMana, MANA_COLORS } from '../components/mana-symbols.js';
import { attachPreview } from '../components/card-preview.js';
import { showToast } from '../components/toast.js';

// ─── State ──────────────────────────────────────────────────────────────────
let searchResults = [];
let currentDeck = { id: null, name: 'New Deck', format: 'standard', cards: [], notes: '' };
let savedDecks = [];
let sets = [];
let searchTimeout = null;
let activeColors = new Set();
let isLoading = false;
let collection = {};
let filterOwnedOnly = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCardImageUri(card) {
  return card?.image_uris?.normal || card?.image_uris?.large || null;
}

function getRarityColor(rarity) {
  return { common: '#9ca3af', uncommon: '#94a3b8', rare: '#fbbf24', mythic: '#f97316' }[rarity] || '#9ca3af';
}

function getCardQuantity(cardId) {
  const entry = currentDeck.cards.find(c => c.id === cardId);
  return entry ? entry.qty : 0;
}

function countCards() {
  return currentDeck.cards.reduce((sum, c) => sum + c.qty, 0);
}

// ─── Deck Manipulation ───────────────────────────────────────────────────────

function addCard(card) {
  const existing = currentDeck.cards.find(c => c.id === card.id);
  const isLand = card.type_line?.toLowerCase().includes('basic land');
  const max = isLand ? 99 : 4;

  if (existing) {
    if (existing.qty >= max) {
      showToast(`Max ${max} copies of ${card.name}`, 'info');
      return;
    }
    existing.qty++;
  } else {
    currentDeck.cards.push({
      id: card.id,
      name: card.name,
      qty: 1,
      mana_cost: card.mana_cost,
      cmc: card.cmc,
      type_line: card.type_line,
      colors: card.colors,
      image_uris: card.image_uris,
    });
  }
  renderDeckList();
  renderAnalysis();
}

function removeCard(cardId) {
  const idx = currentDeck.cards.findIndex(c => c.id === cardId);
  if (idx === -1) return;
  if (currentDeck.cards[idx].qty > 1) {
    currentDeck.cards[idx].qty--;
  } else {
    currentDeck.cards.splice(idx, 1);
  }
  renderDeckList();
  renderAnalysis();
}

function removeCardFully(cardId) {
  currentDeck.cards = currentDeck.cards.filter(c => c.id !== cardId);
  renderDeckList();
  renderAnalysis();
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function doSearch() {
  const q = document.getElementById('card-search-input')?.value ?? '';
  const typeFilter = document.getElementById('filter-type')?.value ?? '';
  const cmcFilter = document.getElementById('filter-cmc')?.value ?? '';
  const rarityFilter = document.getElementById('filter-rarity')?.value ?? '';
  const setFilter = document.getElementById('filter-set')?.value ?? '';

  const params = { q };
  if (activeColors.size > 0) params.colors = [...activeColors].join('');
  if (typeFilter) params.types = typeFilter;
  if (cmcFilter !== '') params.cmc = cmcFilter;
  if (rarityFilter) params.rarity = rarityFilter;
  if (setFilter) params.set = setFilter;

  // We still fetch all results but filter on frontend for now if needed, 
  // or let the backend handle it? The user said "filter out any cards where the card name does not exist in the collection".
  // Since we are paging 100 at a time probably, we can just filter the results array.

  isLoading = true;
  renderSearchResults(null);

  try {
    const data = await api.searchCards(params);
    searchResults = data.results;

    if (filterOwnedOnly) {
      searchResults = searchResults.filter(c => collection[c.name.toLowerCase()] > 0);
    }

    renderSearchResults(filterOwnedOnly ? searchResults.length : data.total);
  } catch (err) {
    showToast('Search failed: ' + err.message, 'error');
    renderSearchResults(0);
  }
  isLoading = false;
}

function scheduleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(doSearch, 300);
}

// ─── Render: Search Results ──────────────────────────────────────────────────

function renderSearchResults(total) {
  const container = document.getElementById('card-results');
  const countEl = document.getElementById('results-count');
  if (!container) return;

  if (total === null) {
    container.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;
    if (countEl) countEl.textContent = '';
    return;
  }

  if (countEl) countEl.textContent = total !== undefined ? `${total} cards` : '';

  if (searchResults.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No cards found</div>
        <div class="empty-state-desc">Try different search terms or filters</div>
      </div>`;
    return;
  }

  container.innerHTML = searchResults.map(card => {
    const manaHtml = renderMana(card.mana_cost);
    const rarityColor = getRarityColor(card.rarity);
    const typeShort = (card.type_line || '').split('—')[0].trim().replace('Legendary ', '');
    const ownedQty = collection[card.name.toLowerCase()] || 0;
    const ownedHtml = ownedQty > 0 ? `<span class="card-item-owned" title="Owned in collection">x${ownedQty}</span>` : '';

    return `
      <div class="card-item" data-card-id="${card.id}" role="button" tabindex="0" aria-label="Add ${card.name} to deck">
        <div class="card-item-mana">${manaHtml}</div>
        <div class="card-item-name">${card.name} ${ownedHtml}</div>
        <div class="card-item-type">${typeShort}</div>
        <div class="card-item-rarity" style="background:${rarityColor}" title="${card.rarity}"></div>
        <div class="card-item-add">＋</div>
      </div>`;
  }).join('');

  // Attach events
  container.querySelectorAll('.card-item').forEach((el, i) => {
    const card = searchResults[i];
    el.addEventListener('click', () => addCard(card));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') addCard(card); });
    const imgUri = getCardImageUri(card);
    if (imgUri) attachPreview(el, () => imgUri);
  });
}

// ─── Render: Deck List ───────────────────────────────────────────────────────

function getCardSection(typeStr) {
  const t = (typeStr || '').toLowerCase();
  if (t.includes('creature')) return 'Creatures';
  if (t.includes('planeswalker')) return 'Planeswalkers';
  if (t.includes('instant')) return 'Instants';
  if (t.includes('sorcery')) return 'Sorceries';
  if (t.includes('enchantment')) return 'Enchantments';
  if (t.includes('artifact')) return 'Artifacts';
  if (t.includes('land')) return 'Lands';
  return 'Other';
}

const SECTION_ORDER = ['Creatures', 'Planeswalkers', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Lands', 'Other'];

function renderDeckList() {
  const container = document.getElementById('deck-cards');
  const countEl = document.getElementById('deck-total-count');
  if (!container) return;

  const total = countCards();
  if (countEl) {
    countEl.textContent = total;
    countEl.className = 'deck-count-number';
    if (total === 60) countEl.classList.add('count-60');
    else if (total > 60) countEl.classList.add('count-over');
  }

  if (currentDeck.cards.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🃏</div>
        <div class="empty-state-title">Empty Deck</div>
        <div class="empty-state-desc">Search for cards and click to add them</div>
      </div>`;
    return;
  }

  // Group by section
  const sections = {};
  for (const card of currentDeck.cards) {
    const section = getCardSection(card.type_line);
    if (!sections[section]) sections[section] = [];
    sections[section].push(card);
  }

  let html = '';
  for (const section of SECTION_ORDER) {
    if (!sections[section]) continue;
    const cards = sections[section].sort((a, b) => (a.cmc || 0) - (b.cmc || 0) || a.name.localeCompare(b.name));
    const sectionCount = cards.reduce((s, c) => s + c.qty, 0);
    html += `<div class="deck-section-header">${section} <span style="color:var(--gold)">(${sectionCount})</span></div>`;
    html += cards.map(card => `
      <div class="deck-card-row" data-card-id="${card.id}">
        <div class="deck-card-qty">
          <button class="qty-btn dec-btn" data-id="${card.id}" title="Remove one">−</button>
          <span class="qty-num">${card.qty}</span>
          <button class="qty-btn inc-btn" data-id="${card.id}" title="Add one">+</button>
        </div>
        <div class="deck-card-name" title="${card.name}">${card.name}</div>
        <span style="font-size:10px;color:var(--text-muted)">${renderMana(card.mana_cost)}</span>
        <button class="deck-card-remove rm-btn" data-id="${card.id}" title="Remove from deck">✕</button>
      </div>`).join('');
  }
  container.innerHTML = html;

  // Attach events
  container.querySelectorAll('.inc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = currentDeck.cards.find(c => c.id === btn.dataset.id);
      if (card) addCard(card);
    });
  });
  container.querySelectorAll('.dec-btn').forEach(btn => {
    btn.addEventListener('click', () => removeCard(btn.dataset.id));
  });
  container.querySelectorAll('.rm-btn').forEach(btn => {
    btn.addEventListener('click', () => removeCardFully(btn.dataset.id));
  });

  // Card hover preview on deck rows
  container.querySelectorAll('.deck-card-row').forEach(row => {
    const card = currentDeck.cards.find(c => c.id === row.dataset.cardId);
    const imgUri = card?.image_uris?.normal || null;
    if (imgUri) attachPreview(row, () => imgUri);
  });
}

// ─── Render: Analysis ────────────────────────────────────────────────────────

function renderAnalysis() {
  const cards = currentDeck.cards;

  // Mana curve
  const curve = Array(9).fill(0);
  for (const c of cards) {
    if (!c.type_line?.toLowerCase().includes('land')) {
      const cmc = Math.min(Math.floor(c.cmc || 0), 8);
      curve[cmc] += c.qty;
    }
  }
  const maxCurve = Math.max(...curve, 1);
  const curveEl = document.getElementById('mana-curve');
  if (curveEl) {
    curveEl.innerHTML = curve.map((count, cmc) => `
      <div class="curve-bar-col">
        <div class="curve-bar-count">${count || ''}</div>
        <div class="curve-bar" style="height:${Math.round((count / maxCurve) * 70)}px"></div>
        <div class="curve-bar-label">${cmc === 8 ? '8+' : cmc}</div>
      </div>`).join('');
  }

  // Color distribution
  const colorCount = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const c of cards) {
    if (!c.type_line?.toLowerCase().includes('land')) {
      if (!c.colors || c.colors.length === 0) colorCount.C += c.qty;
      else c.colors.forEach(col => { colorCount[col] = (colorCount[col] || 0) + c.qty; });
    }
  }
  const colorEl = document.getElementById('color-pips');
  const COLOR_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' };
  if (colorEl) {
    const nonZero = Object.entries(colorCount).filter(([, v]) => v > 0);
    colorEl.innerHTML = nonZero.length === 0
      ? '<span style="color:var(--text-muted);font-size:12px">No cards yet</span>'
      : nonZero.map(([col, cnt]) => `
          <div class="color-pip-item">
            <div class="color-pip-dot" style="background:${MANA_COLORS[col]}"></div>
            <span>${COLOR_LABELS[col]}: <strong>${cnt}</strong></span>
          </div>`).join('');
  }

  // Types breakdown
  const types = { Creatures: 0, Spells: 0, Lands: 0, Artifacts: 0, Enchantments: 0 };
  for (const c of cards) {
    const t = (c.type_line || '').toLowerCase();
    if (t.includes('creature')) types.Creatures += c.qty;
    else if (t.includes('land')) types.Lands += c.qty;
    else if (t.includes('artifact')) types.Artifacts += c.qty;
    else if (t.includes('enchantment')) types.Enchantments += c.qty;
    else types.Spells += c.qty;
  }
  const total = countCards() || 1;
  const typeEl = document.getElementById('type-breakdown');
  if (typeEl) {
    typeEl.innerHTML = Object.entries(types)
      .filter(([, v]) => v > 0)
      .map(([name, cnt]) => `
        <div class="type-row">
          <span class="type-label">${name}</span>
          <div class="type-bar-bg"><div class="type-bar-fill" style="width:${((cnt / total) * 100).toFixed(1)}%"></div></div>
          <span class="type-count">${cnt}</span>
        </div>`).join('');
  }
}

// ─── Import / Export ─────────────────────────────────────────────────────────

function exportDeckToArena() {
  if (currentDeck.cards.length === 0) { showToast('Deck is empty', 'info'); return; }
  const lines = [];
  const sections = {};
  for (const c of currentDeck.cards) {
    const section = c.type_line?.toLowerCase().includes('land') ? 'land' : 'main';
    if (!sections[section]) sections[section] = [];
    sections[section].push(c);
  }
  if (sections.main) sections.main.forEach(c => lines.push(`${c.qty} ${c.name}`));
  if (sections.land) { lines.push(''); sections.land.forEach(c => lines.push(`${c.qty} ${c.name}`)); }
  navigator.clipboard.writeText(lines.join('\n')).then(
    () => showToast('Deck copied to clipboard (Arena format)!', 'success'),
    () => showToast('Could not copy to clipboard', 'error')
  );
}

async function importDeckFromArena(text) {
  const lines = text.trim().split('\n');
  const cardNames = [];
  for (const line of lines) {
    const m = line.trim().match(/^(\d+)\s+(.+)$/);
    if (m) cardNames.push({ qty: parseInt(m[1]), name: m[2].trim() });
  }
  if (cardNames.length === 0) { showToast('No valid cards found in import', 'error'); return; }

  showToast(`Importing ${cardNames.length} card types...`, 'info');
  currentDeck.cards = [];

  for (const { qty, name } of cardNames) {
    try {
      const data = await api.searchCards({ q: name });
      const exact = data.results.find(c => c.name.toLowerCase() === name.toLowerCase()) || data.results[0];
      if (exact) {
        currentDeck.cards.push({ ...exact, qty: Math.min(qty, 4) });
      }
    } catch { /* skip */ }
  }

  renderDeckList();
  renderAnalysis();
  showToast(`Imported ${currentDeck.cards.length} card types!`, 'success');
}

// ─── Save / Load ─────────────────────────────────────────────────────────────

async function saveDeck() {
  const nameEl = document.getElementById('deck-name-input');
  currentDeck.name = nameEl?.value.trim() || 'Untitled Deck';
  if (!currentDeck.name) { showToast('Please name your deck', 'info'); return; }

  try {
    if (currentDeck.id) {
      await api.updateDeck(currentDeck.id, currentDeck);
    } else {
      const saved = await api.createDeck(currentDeck);
      currentDeck.id = saved.id;
    }
    await loadSavedDecks();
    showToast('Deck saved!', 'success');
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}

async function loadSavedDecks() {
  try {
    savedDecks = await api.getDecks();
    renderSavedDecks();
  } catch { }
}

function renderSavedDecks() {
  const el = document.getElementById('saved-decks-list');
  if (!el) return;
  if (savedDecks.length === 0) {
    el.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text-muted);text-align:center">No saved decks yet</div>';
    return;
  }
  el.innerHTML = savedDecks.map(d => `
    <div class="saved-deck-item" data-deck-id="${d.id}" role="button" tabindex="0">
      <div>
        <div class="saved-deck-name">${d.name}</div>
        <div class="saved-deck-meta">${d.cardCount || 0} cards · ${d.format}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-xs btn-secondary load-deck-btn" data-deck-id="${d.id}">Load</button>
        <button class="btn btn-xs btn-danger del-deck-btn" data-deck-id="${d.id}">✕</button>
      </div>
    </div>`).join('');

  el.querySelectorAll('.load-deck-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); loadDeck(btn.dataset.deckId); });
  });
  el.querySelectorAll('.del-deck-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this deck?')) {
        await api.deleteDeck(btn.dataset.deckId);
        await loadSavedDecks();
        showToast('Deck deleted', 'info');
      }
    });
  });
}

async function loadDeck(deckId) {
  try {
    const deck = await api.getDeck(deckId);
    currentDeck = { ...deck };
    const nameEl = document.getElementById('deck-name-input');
    if (nameEl) nameEl.value = deck.name;
    renderDeckList();
    renderAnalysis();
    showToast(`Loaded "${deck.name}"`, 'success');
  } catch (err) {
    showToast('Failed to load deck: ' + err.message, 'error');
  }
}

function newDeck() {
  currentDeck = { id: null, name: 'New Deck', format: 'standard', cards: [], notes: '' };
  const nameEl = document.getElementById('deck-name-input');
  if (nameEl) nameEl.value = 'New Deck';
  renderDeckList();
  renderAnalysis();
  showToast('New deck started', 'info');
}

// ─── Import Modal ────────────────────────────────────────────────────────────

function openImportModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="import-title">
      <div class="modal-title" id="import-title">Import from Arena</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
        Paste your deck list in MTG Arena format (e.g. <code style="background:var(--bg-input);padding:1px 4px;border-radius:3px">4 Lightning Bolt</code>)
      </p>
      <textarea id="import-text" class="textarea" style="height:200px;resize:vertical" placeholder="4 Card Name&#10;3 Another Card&#10;..."></textarea>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="import-cancel">Cancel</button>
        <button class="btn btn-primary" id="import-confirm">Import Deck</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById('import-cancel').addEventListener('click', () => backdrop.remove());
  document.getElementById('import-confirm').addEventListener('click', async () => {
    const text = document.getElementById('import-text').value;
    backdrop.remove();
    await importDeckFromArena(text);
  });
  document.getElementById('import-text').focus();
}

// ─── Collection Modal ────────────────────────────────────────────────────────

function openCollectionModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="coll-title">
      <div class="modal-title" id="coll-title">Manage Collection</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
        Since MTG Arena removed native collection exports, you will need to use a third-party memory scanner (like MTG Arena Tool or Untapped) to export your collection to a text file. Paste that list here:
      </p>
      <textarea id="coll-text" class="textarea" style="height:200px;resize:vertical" placeholder="4 Delver of Secrets (MID) 47&#10;..."></textarea>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="coll-cancel">Cancel</button>
        <button class="btn btn-primary" id="coll-confirm">Update Collection</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById('coll-cancel').addEventListener('click', () => backdrop.remove());
  document.getElementById('coll-confirm').addEventListener('click', async () => {
    const text = document.getElementById('coll-text').value;
    if (!text.trim()) { backdrop.remove(); return; }
    try {
      const res = await api.updateCollection(text);
      backdrop.remove();
      showToast(`Collection updated! ${res.count} cards tracked.`, 'success');
      await loadCollection();
      doSearch();
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
    }
  });
  document.getElementById('coll-text').focus();
}

async function loadCollection() {
  try {
    collection = await api.getCollection();
  } catch { }
}

// ─── Main Render ─────────────────────────────────────────────────────────────

export async function renderDeckBuilder(container) {
  container.innerHTML = `
    <div class="deck-builder-layout">
      <!-- Search Panel -->
      <div class="glass-panel search-panel">
        <div class="panel-header">
          <span class="panel-title">Card Search</span>
          <span id="results-count" class="results-count"></span>
        </div>
        <div class="search-controls">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input id="card-search-input" class="input" type="search" placeholder="Search by name, type, or text…" autocomplete="off" />
          </div>
          <div class="color-filter">
            ${['W', 'U', 'B', 'R', 'G', 'C'].map(c => `
              <button class="color-btn" data-color="${c}" title="${{ W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }[c]}">${c}</button>
            `).join('')}
          </div>
          <div class="filter-row">
            <select id="filter-type" class="select"><option value="">All Types</option>
              ${['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].map(t => `<option>${t}</option>`).join('')}
            </select>
            <select id="filter-cmc" class="select"><option value="">Any Cost</option>
              ${[0, 1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}">${n === 7 ? '7+' : n}</option>`).join('')}
            </select>
          </div>
          <div class="filter-row">
            <select id="filter-rarity" class="select"><option value="">All Rarities</option>
              ${['common', 'uncommon', 'rare', 'mythic'].map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
            </select>
            <select id="filter-set" class="select"><option value="">All Sets</option></select>
          </div>
          <div class="filter-row" style="margin-top:8px">
            <label class="toggle-wrap">
              <input type="checkbox" id="filter-owned-only" class="toggle-input" />
              <span class="toggle-slider"></span>
              <span class="toggle-label">Owned Cards Only</span>
            </label>
            <button class="btn btn-xs btn-ghost" id="manage-collection-btn" style="width:auto;margin-left:auto">Manage Collection</button>
          </div>
        </div>
        <div id="card-results" class="card-results">
          <div class="empty-state">
            <div class="empty-state-icon">✨</div>
            <div class="empty-state-title">Search for cards</div>
            <div class="empty-state-desc">Type a name, keyword, or use filters above</div>
          </div>
        </div>
      </div>

      <!-- Deck List Panel -->
      <div class="glass-panel deck-list-panel">
        <div class="panel-header">
          <span class="panel-title">Deck List</span>
          <select id="deck-format-select" class="select" style="width:auto;font-size:12px;padding:5px 28px 5px 10px">
            <option value="standard">Standard</option>
            <option value="draft">Draft</option>
            <option value="historic">Historic</option>
            <option value="explorer">Explorer</option>
          </select>
        </div>
        <div class="deck-list-controls">
          <input id="deck-name-input" class="input deck-name-input" type="text" value="${currentDeck.name}" placeholder="Deck Name" />
          <button class="btn btn-primary btn-sm" id="save-deck-btn">💾 Save</button>
          <button class="btn btn-ghost btn-sm" id="new-deck-btn">＋ New</button>
        </div>
        <div id="deck-cards" class="deck-cards">
          <div class="empty-state"><div class="empty-state-icon">🃏</div><div class="empty-state-title">Empty Deck</div><div class="empty-state-desc">Search for cards and click to add them</div></div>
        </div>
        <div class="deck-count-bar">
          <span>Total Cards</span>
          <div style="display:flex;align-items:baseline;gap:4px">
            <span id="deck-total-count" class="deck-count-number">0</span>
            <span style="color:var(--text-muted);font-size:13px">/ 60</span>
          </div>
        </div>
        <div class="import-export-area">
          <button class="btn btn-ghost btn-sm" id="import-btn">⬆ Import</button>
          <button class="btn btn-ghost btn-sm" id="export-btn">⬇ Export</button>
        </div>
      </div>

      <!-- Analysis + Saved Decks Panel -->
      <div class="glass-panel analysis-panel" style="overflow-y:auto">
        <div class="panel-header" style="position:sticky;top:0;background:var(--bg-panel);z-index:1">
          <span class="panel-title">Analysis</span>
        </div>

        <div class="analysis-section">
          <div class="analysis-section-title">Mana Curve</div>
          <div id="mana-curve" class="curve-bars"></div>
        </div>

        <div class="analysis-section">
          <div class="analysis-section-title">Colors</div>
          <div id="color-pips" class="color-pips"></div>
        </div>

        <div class="analysis-section">
          <div class="analysis-section-title">Card Types</div>
          <div id="type-breakdown" class="type-breakdown"></div>
        </div>

        <div class="analysis-section">
          <div class="panel-title" style="margin-bottom:10px">Saved Decks</div>
          <div id="saved-decks-list" class="saved-decks-list"></div>
        </div>
      </div>
    </div>`;

  // Load sets for filter
  api.getCardSets().then(setList => {
    sets = setList;
    const setEl = document.getElementById('filter-set');
    if (setEl) {
      setEl.innerHTML = '<option value="">All Sets</option>' +
        setList.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
    }
  }).catch(() => { });

  // Event listeners
  document.getElementById('card-search-input')?.addEventListener('input', scheduleSearch);
  document.getElementById('filter-type')?.addEventListener('change', doSearch);
  document.getElementById('filter-cmc')?.addEventListener('change', doSearch);
  document.getElementById('filter-rarity')?.addEventListener('change', doSearch);
  document.getElementById('filter-set')?.addEventListener('change', doSearch);
  document.getElementById('filter-owned-only')?.addEventListener('change', e => {
    filterOwnedOnly = e.target.checked;
    doSearch();
  });
  document.getElementById('manage-collection-btn')?.addEventListener('click', openCollectionModal);

  // Color filter buttons
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.color;
      if (activeColors.has(col)) {
        activeColors.delete(col);
        btn.classList.remove('active');
      } else {
        activeColors.add(col);
        btn.classList.add('active');
      }
      doSearch();
    });
  });

  document.getElementById('save-deck-btn')?.addEventListener('click', saveDeck);
  document.getElementById('new-deck-btn')?.addEventListener('click', newDeck);
  document.getElementById('import-btn')?.addEventListener('click', openImportModal);
  document.getElementById('export-btn')?.addEventListener('click', exportDeckToArena);

  document.getElementById('deck-format-select')?.addEventListener('change', e => {
    currentDeck.format = e.target.value;
  });

  await loadSavedDecks();
  await loadCollection();
  renderDeckList();
  renderAnalysis();
  doSearch();
}
