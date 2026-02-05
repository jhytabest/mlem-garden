# Mlem Garden

A web application built with SvelteKit and deployed to Cloudflare Workers with D1 database.

## Tech Stack

- **Frontend**: [SvelteKit](https://kit.svelte.dev/) with Svelte 5
- **Backend**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Language**: TypeScript

## Setup

### Prerequisites

- Node.js (v18+)
- npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Installation

```bash
# Install dependencies
npm install

# Generate Cloudflare types
npm run cf-typegen
```

## Development

```bash
# Start development server
npm run dev

# Type checking
npm run check

# Type checking (watch mode)
npm run check:watch
```

## Testing

```bash
# Run unit tests
npm test

# Run unit tests (watch mode)
npm run test:watch

# Run unit tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui
```

## Deployment

```bash
# Preview with Wrangler
npm run preview

# Deploy to Cloudflare Workers
npm run deploy

# Deploy realtime worker
npm run deploy:realtime
```

## Project Structure

```
├── src/              # SvelteKit application source
├── migrations/       # D1 database migrations
├── e2e/              # Playwright e2e tests
├── schema.sql        # Database schema
├── wrangler.toml     # Cloudflare Workers config
└── wrangler.realtime.toml  # Realtime worker config
```

## License

Private
