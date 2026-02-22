const BASE = '/api';

async function req(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

export const api = {
    // Cards
    searchCards: (params) => req('/cards/search?' + new URLSearchParams(params)),
    getCardSets: () => req('/cards/sets'),
    getCardStatus: () => req('/cards/status'),

    // Decks
    getDecks: () => req('/decks'),
    getDeck: (id) => req(`/decks/${id}`),
    createDeck: (data) => req('/decks', { method: 'POST', body: data }),
    updateDeck: (id, d) => req(`/decks/${id}`, { method: 'PUT', body: d }),
    deleteDeck: (id) => req(`/decks/${id}`, { method: 'DELETE' }),

    // Matches
    getMatches: (params = {}) => req('/matches?' + new URLSearchParams(params)),
    addMatch: (data) => req('/matches', { method: 'POST', body: data }),
    deleteMatch: (id) => req(`/matches/${id}`, { method: 'DELETE' }),

    // Stats
    getStats: (params = {}) => req('/stats?' + new URLSearchParams(params)),

    // Log status
    getLogStatus: () => req('/log-status'),

    // Meta
    getMeta: () => req('/meta'),

    // Collection
    getCollection: () => req('/collection'),
    updateCollection: (text) => req('/collection', { method: 'POST', body: { text } }),
};
