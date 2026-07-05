# DouzePoints - Eurovision Scoreboard Simulator

Experience the excitement of Eurovision with DouzePoints, the interactive scoreboard simulator. Vote for countries, watch points accumulate, and relive the magic of Eurovision Song Contest.

## Features

- **Interactive scoreboard simulation** — simulate Eurovision voting in real time, manually or on auto-play (Presentation mode)
- **Official year data** — ESC 2004–2026 and JESC 2016–2025 editions with countries, artists, songs, and flags
- **Flexible stage structure** — standard Semi-Finals + Grand Final, Grand Final only, or unlimited custom stages (Heats, Quarter-Finals, etc.)
- **Multiple voting modes** — Jury + Televote, Televote only, Jury only, or Combined; configurable per stage
- **Custom points system** — configure point values per position; optional separate jury/televote scales
- **Predefined voting & presets** — pre-fill all votes before the simulation; save and reload named configurations
- **Odds system** — assign per-country jury/televote odds and tune a Randomness Level slider
- **Split screen qualifier reveal** — ESC 2025-style dramatic qualifier selection with configurable candidates
- **Custom themes** — build fully custom themes with colors, fonts, flag shapes, board animations, and sound effects
- **Community content** — browse, apply, like, and save public themes and contests from other users
- **Cloud saving** — save contest setup + simulation results to the cloud; share by link
- **Custom entries** — create fictional or non-standard entries with custom flags and artists
- **Detailed stats** — full voting breakdown, jury vs. televote split, and summary statistics
- **Shareable images** — generate and download custom scoreboard and stats PNGs
- **Global leaderboard** — aggregated country rankings across all completed public contests
- **9 languages** — English, French, German, Italian, Polish, Ukrainian, Greek, Portuguese, and Spanish
- **Responsive** — works on mobile, tablet, and desktop

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: GSAP, React Flip Toolkit
- **Deployment**: Cloudflare Workers (Wrangler)

## Development

### Prerequisites

- Node.js 18+ 
- Yarn package manager

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

### Development Server

Start the development server:
```bash
yarn dev
```

The application will be available at `http://localhost:3000`

### Building for Production

Build the application:
```bash
yarn build
```

Preview the production build:
```bash
yarn preview
```

### Deployment

Deploy to Cloudflare Workers:
```bash
yarn deploy
```

## Project Structure

```
src/
├── components/          # React components
│   ├── board/          # Scoreboard components
│   ├── controlsPanel/  # Voting controls
│   ├── setup/          # Event setup components
│   └── ...
├── state/              # Zustand stores
├── data/               # Country data and static assets
├── models/             # TypeScript type definitions
├── helpers/            # Utility functions
├── hooks/              # Custom React hooks
└── theme/              # Theme configuration
```
