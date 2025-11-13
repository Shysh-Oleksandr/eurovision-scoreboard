# DouzePoints - Eurovision Scoreboard Simulator

Experience the excitement of Eurovision with DouzePoints, the interactive scoreboard simulator. Vote for countries, watch points accumulate, and relive the magic of Eurovision Song Contest from 2004-2025.

## Features

- Interactive Eurovision scoreboard simulation
- Support for Eurovision contests from 2004-2025
- Semi-finals and Grand Final modes
- Realistic voting animations
- Beautiful, responsive UI
- Support for all world countries and custom entries

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
