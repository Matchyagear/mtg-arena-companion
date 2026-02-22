// Mana symbol renderer — uses Scryfall SVG sprites
const COLOR_MAP = {
    W: { cls: 'ms-W', label: 'W' },
    U: { cls: 'ms-U', label: 'U' },
    B: { cls: 'ms-B', label: 'B' },
    R: { cls: 'ms-R', label: 'R' },
    G: { cls: 'ms-G', label: 'G' },
    C: { cls: 'ms-C', label: '◇' },
    X: { cls: 'ms-X', label: 'X' },
};

/**
 * Parse MTG mana cost string like "{2}{W}{U}" into symbol objects
 */
export function parseMana(manaCost) {
    if (!manaCost) return [];
    const matches = manaCost.match(/\{[^}]+\}/g) || [];
    return matches.map(m => {
        const raw = m.slice(1, -1); // strip { }
        if (COLOR_MAP[raw]) return { ...COLOR_MAP[raw] };
        if (/^\d+$/.test(raw)) return { cls: 'ms-num', label: raw };
        return { cls: 'ms-C', label: raw };
    });
}

/**
 * Render mana cost as HTML string
 */
export function renderMana(manaCost) {
    const syms = parseMana(manaCost);
    return syms.map(s => `<span class="mana-sym ${s.cls}" title="${s.label}">${s.label}</span>`).join('');
}

/**
 * Get color of a mana pip — authentic MTG mana colors
 */
export const MANA_COLORS = {
    W: '#f5f0db',  // Plains — warm ivory
    U: '#2477b0',  // Island — sapphire blue
    B: '#8650c0',  // Swamp — deep violet
    R: '#d04030',  // Mountain — ember red
    G: '#20823c',  // Forest — deep green
    C: '#a09078',  // Colorless — warm stone
};
