# MTG Arena Companion

A **local-first personal companion app for MTG Arena** that runs entirely on your own machine. No accounts, no cloud, no subscriptions. Built with:

- **Frontend**: Vanilla JS + CSS (Vite dev server)
- **Backend**: Express.js API server
- **Storage**: Plain JSON files (`data/decks.json`, `data/matches.json`, `data/collection.json`)
- **Card data**: Scryfall public API (cached locally as `data/card-cache.json`)

## Quickstart

```bash
npm install
npm run dev
```

The app will start the Express backend on port 3001 and the Vite frontend on port 5173. The browser should open automatically to `http://localhost:5173`.

---

## Features

### 1 — Home / Card Search
- Fuzzy card search powered by the locally-cached Scryfall bulk dataset.
- Filters by color, type, set, rarity, CMC range.
- Card Detail panel with an ELI5 plain-English summary, meta pills, and deck-fit indicators.
- Card image hover preview tooltip on any card name throughout the app.

### 2 — Deck Builder
- Create, rename, delete decks.
- Format selector (Standard, Pioneer, Modern, etc.).
- Deck analysis panel: Mana curve chart, Color distribution, Card type breakdown.
- Import deck from text (MTGA clipboard format).
- Export deck to text.

### 3 — Collection Tracker
- **Manage Collection** — Import your collection exported from a tracker like MTG Arena Tool.
- **Owned Indicators** — Search results show "xN" badges indicating how many of each card you own.
- **Owned filter** — Toggle "Owned Cards Only" to restrict search results to your current collection.

### 4 — Match Tracker
- Log individual matches: opponent archetype, result, deck used, notes.
- **Auto-import from Arena log file** — watches `%APPDATA%\LocalLow\Wizards of the Coast\MTGA\Player.log` and parses match results in real-time as you play.
- View recent match history with pagination.

### 5 — Statistics
- Lifetime win rate, win/loss/draw counts, and streak display.
- Win rate by deck and opponent archetype.
- Win rate over time (day-by-day bar chart).

### 6 — Meta Tracker
- **🏆 Tier List** — Live Tier Data scraped from MTGGoldfish.
- Sync button to pull fresh standard meta.
- **⚔️ Matchup Matrix** — Win % for every archetype vs every other.
- **📋 Best & Worst Matchups** — Per-deck summary.

---

## Visual Theme

The UI is styled to evoke the **Magic: The Gathering physical card game**:
- Near-black background with all 5 mana color ambient glows.
- Glass panels simulating the double-border card frame.
- Gold palette and parchment-colored text.
- Cinzel / Cinzel Decorative fonts.

---

## Architecture

```
magic/
├── index.html              ← Single-page shell with nav buttons
├── vite.config.js          ← Vite proxies /api/* → localhost:3001
├── data/
│   ├── decks.json          ← Saved decks (gitignored, private)
│   ├── matches.json        ← Match history (gitignored, private)
│   ├── collection.json     ← Saved collection data (gitignored, private)
│   ├── live-meta.json      ← MTGGoldfish cached data (gitignored)
│   └── card-cache.json     ← Scryfall bulk data cache (~18 MB, gitignored)
├── server/
│   ├── index.js            ← Express entry point, mounts all routers
│   ├── scryfall.js         ← Card search, bulk data caching, sets
│   ├── store.js            ← Deck + match CRUD endpoints + stats + collection
│   ├── meta.js             ← Curated and cached meta snapshot endpoint
│   ├── scraper.js          ← Cheerio scraper for MTGGoldfish Live Meta
│   └── arena-log-parser.js ← Watches the Arena log file for auto-match import
└── src/
    ├── main.js             ← Bootstraps app, wires nav, loads initial view
    ├── api.js              ← Thin fetch wrapper for all backend calls
    ├── style.css           ← Full MTG-themed CSS
    ├── views/
    │   ├── home.js         ← Card search + ELI5 card detail view
    │   ├── deck-builder.js ← Deck creation, editing, analysis, collection
    │   ├── match-tracker.js← Log matches, auto-import from Arena
    │   ├── stats.js        ← Win rate charts, streaks, breakdown
    │   └── meta.js         ← Meta tier list + matchup matrix
    └── components/
        ├── card-preview.js ← Hover tooltip showing card image
        ├── mana-symbols.js ← Renders colored mana pips
        └── toast.js        ← Toast notification utility
```
