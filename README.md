# Glimpse

Glimpse is a full-stack social news platform for short posts, communities, follows, voting, notifications, curated news, and real-time activity.

It uses React + Vite on the web, Fastify + Prisma on the API, PostgreSQL for persistence, optional Redis, and Socket.IO for live events.

## Features

- User registration, login, refresh-token sessions, and logout
- Home feeds: For You, Trending, Latest, and Following
- Posts, replies, voting, tags, and communities
- User profiles and follows
- Notifications
- Curated RSS news ingestion with optional AI summaries
- Real-time notifications/comments when a Socket.IO backend is configured
- Responsive React interface with infinite scrolling
- Vercel serverless API adapter and Railway-style long-running server support

## Architecture

    React / Vite
          |
          | HTTPS + bearer access token
          v
    Fastify API
      |       |
      |       +---- Socket.IO (optional long-running backend)
      |
      +---- Prisma ---- PostgreSQL
      |
      +---- Redis (optional)
      |
      +---- RSS feeds ---- optional Anthropic summaries

The API can run as a normal Node process or through the Vercel catch-all function in `api/[...path].ts`.

## Requirements

- Node.js 20.19+
- pnpm 10+
- PostgreSQL
- Redis is optional
- An Anthropic API key is optional and only needed for AI news summaries

## Local development

Install workspace dependencies:

    pnpm install

Configure the API:

    cp apps/api/.env.example apps/api/.env

Set at least:

    DATABASE_URL="postgresql://glimpse:glimpse_dev@localhost:5432/glimpse"
    JWT_SECRET="replace-with-a-random-secret-at-least-32-characters"
    PORT=3000
    NODE_ENV=development
    CORS_ORIGINS="http://localhost:5173"

Push the Prisma schema:

    pnpm db:push

Seed the development database:

    pnpm db:seed

Run API and web together:

    pnpm dev

Web: `http://localhost:5173`

API: `http://localhost:3000`

Health: `http://localhost:3000/health`

## Environment

Backend variables are documented in `apps/api/.env.example`.

Web variables are documented in `apps/web/.env.example`:

    VITE_API_URL=
    VITE_SOCKET_URL=

For local development, leave `VITE_API_URL` empty so Vite uses `/api` for same-origin deployments, or set it to the API URL when the frontend and backend run on separate origins.

Set `VITE_SOCKET_URL` only when a Socket.IO server is actually reachable. The serverless Vercel function does not host Socket.IO, so the variable should point to the long-running API service in that deployment model.

## Authentication design

Access JWTs are kept in browser memory rather than `localStorage`.

Refresh tokens are stored in an HttpOnly cookie. On application startup the web client calls `POST /api/auth/refresh`; the backend rotates the refresh token and returns a short-lived access token.

This reduces the impact of client-side script compromise because the refresh credential is not readable by JavaScript.

Login, registration, and refresh endpoints have stricter rate limits than ordinary API traffic.

## API

### Public

- `GET /health`
- `GET /api/feed`
- `GET /api/posts/:id`
- `GET /api/posts/:id/comments`
- `GET /api/communities`
- `GET /api/communities/:slug`
- `GET /api/news`
- `GET /api/news/trending`
- `GET /api/search`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Authenticated features

- Create/delete posts
- Vote on posts
- Create/join/leave communities
- Follow/unfollow users
- Update your profile
- Read and clear notifications

## Security

The API includes:

- Fastify Helmet security headers
- Global rate limiting
- Tighter login/register/refresh limits
- Zod request validation
- 10 MB multipart upload limit with bounded file/field counts
- HTTP(S)-only validation for user-supplied URLs
- HttpOnly, SameSite refresh cookies
- In-memory access tokens on the web client
- No wildcard CORS
- No system prompts returned by public endpoints
- Permission checks for private/restricted communities
- Ownership checks for post deletion
- Atomic vote updates and unique user/post votes

The Prisma schema also cascades dependent records where appropriate, reducing orphaned data.

## Production deployment

### Database

Create PostgreSQL and set `DATABASE_URL`.

Run:

    pnpm --filter api db:push

For production migrations, prefer:

    pnpm --filter api db:migrate

### API

Run the long-lived API with:

    pnpm --filter api start

Set:

    NODE_ENV=production
    JWT_SECRET=<long-random-secret>
    CORS_ORIGINS=https://your-frontend.example

Socket.IO works on this long-running API.

### Vercel

The repository contains `api/[...path].ts` and `vercel.json`.

Vercel can serve the frontend and API routes, but the serverless function does not provide a persistent Socket.IO server. Configure `VITE_SOCKET_URL` to point at the long-running API service when real-time features are required.

## News ingestion

The API ingests a small fixed set of public RSS feeds on startup and once per hour.

If `ANTHROPIC_API_KEY` is configured, each new item may receive a short AI-generated summary. Failure of the optional summarizer does not prevent the news item from being stored.

## Development checks

Run the type checks:

    pnpm typecheck

Run the full build:

    pnpm build

Run both:

    pnpm check

## Project structure

    glimpse/
    ├── api/                  # Vercel API catch-all
    ├── apps/
    │   ├── api/              # Fastify + Prisma backend
    │   └── web/              # React + Vite frontend
    ├── docker-compose.yml    # Local PostgreSQL + Redis
    ├── package.json
    ├── pnpm-workspace.yaml
    ├── vercel.json
    └── README.md

## License

MIT
