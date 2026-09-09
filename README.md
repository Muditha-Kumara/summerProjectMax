# 🌡️ Smart Heating & Spot-Price Optimization System

An end-to-end smart heating platform for hotel and accommodation rooms:
real-time thermostat control via **Shelly** devices, **day-ahead electricity
spot-price** optimization, booking-driven room states, cost analytics, and an
**AI voice assistant** — with a React admin + guest UI and one-command Docker
deployment.

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](frontend/package.json)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](docker-compose.yml)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

### Heating & device control
- Per-room thermostats backed by **Shelly Cloud** devices — or a built-in
  **virtual Shelly simulator** (7 simulated devices with realistic thermal
  physics, relay hysteresis, and outdoor-temperature heat loss) so the whole
  system runs with **zero hardware**
- Booking-aware room states: pre-heat before check-in, eco/away between guests
- Winter safeguards and alerting (temperature thresholds, device faults)

### Energy optimization
- **Spot-price integration** (spot-hinta.fi / Nord Pool, FI area) with
  15-minute → hourly aggregation and local caching
- Electricity contract management: **fixed**, **spot**, and **tiered** plans
- Cost & consumption analytics: hourly / weekly / monthly / yearly timeseries,
  per-room breakdowns, Today/Tomorrow price charts
- Optimization engine that shifts heating into cheap price windows

### AI & UX
- **Voice assistant** for guests (browser speech recognition + synthesis) to
  control temperature and ask questions
- LLM chat service (OpenAI-compatible endpoints, e.g. GPT-4 or Qwen via
  Alibaba MaaS/DashScope), tuned for low latency
- Role-based UIs: admin dashboard, energy analytics, settings, and a guest
  dashboard with PIN-based booking access
- Multi-language frontend (🇬🇧 EN · 🇫🇮 FI · 🇸🇪 SV), Tailwind CSS + Framer Motion

## 🏗️ Architecture

```
Browser (React SPA · EN/FI/SV)
   │  HTTPS (nginx, self-signed or Let's Encrypt)
   ▼
frontend ──/api/──► backend (Express, port 3000)
                     ├── Shelly Cloud / Virtual Shelly simulator
                     ├── spot-hinta.fi / Nord Pool  (spot prices)
                     ├── OpenWeatherMap             (outdoor temp)
                     ├── LLM chat endpoint          (AI voice assistant)
                     ├── node-cron jobs             (history, optimization, safeguards)
                     └── PostgreSQL 15              (rooms, bookings, prices, history)
```

| Layer      | Tech                                                              |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | React 18, Vite, Tailwind CSS, Recharts, Zustand, react-i18next     |
| Backend    | Node.js 18+, Express, `pg` connection pool, node-cron, JWT, Winston |
| Database   | PostgreSQL 15 (Docker volume `pgdata`)                             |
| Infra      | Docker Compose (dev/prod profiles), Terraform on Alibaba Cloud ECS |

## 📁 Repository layout

```
.
├── backend/            # Express API: routes, services, cron jobs, migrations, seed, Jest tests
├── frontend/           # React SPA (admin + guest), Vite, Tailwind, Vitest tests
├── docker-compose.yml  # db / backend / frontend / seed (dev & prod profiles)
├── infra/              # Terraform: low-cost Alibaba Cloud ECS demo deployment
├── scripts/            # SSL certificate generation
├── ssl/                # TLS certs for nginx (contents not committed)
└── *.md                # Feature docs — see Documentation below
```

## 🚀 Getting started

### Prerequisites

- Docker + Docker Compose
- Node.js ≥ 18 (only if running without Docker)

### 1. Configure the environment

The **root `.env` is the single source of truth** for both Docker Compose and
the backend containers (injected via `env_file`):

```bash
cp .env.example .env
# edit .env — at minimum set POSTGRES_PASSWORD and JWT_SECRET
```

Key settings (everything except DB/JWT is optional for a local demo):

| Variable                                        | Purpose                                                    |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials                                  |
| `JWT_SECRET`                                    | Auth token signing                                         |
| `USE_VIRTUAL_SHELLY=true`                       | Use the built-in device simulator (no Shelly hardware needed) |
| `PRICE_SOURCE=spothinta`                        | Free, keyless spot-price API (alternative: Nord Pool)      |
| `USE_MOCK_PRICES=true`                          | Offline mock prices                                        |
| `OPENWEATHER_API_KEY`                           | Real outdoor temperature (not required in virtual mode)    |
| `OPENAI_API_KEY` / `OPENAI_MODEL`               | AI assistant (runtime overrides live in DB `system_settings`) |

### 2. Run with Docker Compose

**Development** (hot reload — Vite on `:5173`, API on `:3000`):

```bash
docker compose --profile dev up -d
docker compose --profile dev run --rm seed   # migrations + seed data (idempotent)
```

**Production** (nginx on `:80`/`:443`):

```bash
./scripts/generate-ssl-certs.sh              # self-signed cert for local HTTPS
docker compose --profile prod up -d --build
docker compose --profile prod run --rm seed
```

| What                | Where                                                   |
| ------------------- | ------------------------------------------------------- |
| Frontend            | http://localhost (prod) · http://localhost:5173 (dev)   |
| API health check    | `curl http://localhost:3000/health`                     |
| Seeded admin login  | `admin@example.com` / `admin123`                        |
| Sample booking PIN  | `1234`                                                  |

> **Tips**
> - `docker compose --profile prod config` quickly verifies the resolved env wiring.
> - If you see `network ... not found` after a prune, run
>   `docker compose --profile dev down --remove-orphans` and `up -d` again.
> - Re-running the seed is safe — it also replays schema migrations and
>     top-up energy history when needed:
>     `docker compose --profile dev exec backend-dev node src/config/seed.js`

### 3. Run without Docker (optional)

```bash
# terminal 1 — database
docker compose up -d db

# terminal 2 — backend (loads backend/.env; defaults to port 3001 outside Docker)
cd backend && npm install
npm run db:migrate && npm run db:seed
npm run dev

# terminal 3 — frontend
cd frontend && npm install
npm run dev
```

## 🧪 Tests

```bash
cd backend  && npm test              # Jest + Supertest (unit + integration)
cd backend  && npm run test:coverage
cd frontend && npm test              # Vitest
```

## 🔌 API overview

Base path: `/api/v1` · JWT bearer auth (`POST /api/v1/auth/login` for a token).

| Area          | Prefix               | Notes                                              |
| ------------- | -------------------- | -------------------------------------------------- |
| Auth          | `/auth`              | Admin & user login, PIN-based guest access          |
| Rooms         | `/rooms`             | CRUD, live status, target temperature               |
| Bookings      | `/bookings`          | Lifecycle, away schedules                           |
| Optimization  | `/optimization`      | Spot prices, heating schedules, cost optimization   |
| Contracts     | `/contracts`         | Fixed / spot / tiered electricity plans             |
| Costs         | `/costs`             | Timeseries energy & cost analytics                  |
| Alerts        | `/alerts`            | Threshold & device alerts                           |
| AI            | `/ai/chat`           | Assistant endpoint (voice + text)                   |
| Settings      | `/settings`          | System settings, API connectivity tests             |
| Virtual Shelly| `/virtual-shelly`    | Device simulation & debug controls                  |

## ☁️ Deployment

A full low-cost demo stack on **one pay-as-you-go Alibaba Cloud ECS instance**
(Terraform + Docker Compose + self-signed HTTPS, stoppable when idle) lives in
[`infra/`](infra/README.md) — including VM bootstrap, firewall setup, and
`deploy.sh`.

## 📚 Documentation

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) — feature phases: virtual Shelly, spot prices, contracts, energy data
- [VOICE_ASSISTANT_IMPLEMENTATION.md](VOICE_ASSISTANT_IMPLEMENTATION.md) — speech pipeline design
- [ADMIN_ROOMS_FEATURE.md](ADMIN_ROOMS_FEATURE.md) — admin room management
- [SSL_SETUP.md](SSL_SETUP.md) — local & deployed HTTPS setup
- [infra/README.md](infra/README.md) — cloud deployment guide

## ⚠️ Notes & gotchas

- **Never commit real secrets.** `.env` and `infra/myenv.sh` are gitignored;
  start from `.env.example`.
- AI configuration lives in the DB `system_settings` table and **overrides**
  env vars at runtime.
- Spot prices for *tomorrow* appear only after day-ahead publication
  (~14:15 EET); the Tomorrow tab is empty before that by design.
- Database containers and the DB itself run in **UTC**; charts bucket by
  browser-local time.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
