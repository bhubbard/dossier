# Dossier on Cloudflare Workers & Services

This fork of [Dossier](https://github.com/AienTech/dossier) is adapted to run natively on Cloudflare's serverless edge ecosystem with zero cold starts, global distribution, and minimal to zero hosting cost.

---

## ⚡ Cloudflare Architecture Overview

| Dossier Subsystem | Traditional Deployment (Docker) | Cloudflare Native Architecture |
|---|---|---|
| **Fullstack App** | Next.js 16 (Node.js Standalone Container) | Next.js on `workerd` via `@opennextjs/cloudflare` |
| **Database** | PostgreSQL server or local SQLite file | **Cloudflare D1** (`@prisma/adapter-d1`) or **Hyperdrive** (`@prisma/adapter-pg`) |
| **File Storage** | Local `/data/backups` and `/data/downloads` | **Cloudflare R2** (`DOSSIER_BUCKET` binding) |
| **PDF Generation** | Local Chromium via `playwright-core` | **Cloudflare Browser Rendering** (`MYBROWSER` with `@cloudflare/puppeteer`) |
| **AI LLM Engine** | Local Ollama / Anthropic / OpenAI | **Cloudflare Workers AI** (`env.AI` binding with `@cf/meta/llama-3.3-70b-instruct`) |
| **Cache & Sessions** | In-process memory | **Cloudflare Workers KV** (`NEXT_CACHE_WORKERS_KV`) |
| **Scheduled Tasks** | `setTimeout` process loops in `instrumentation.ts` | **Cloudflare Cron Triggers** (`crons = ["0 3 * * *"]`) |

---

## 🚀 Quick Start Deployment

### 1. Prerequisites
- [Node.js](https://nodejs.org) v20+ and [Yarn](https://yarnpkg.com) v4.
- A [Cloudflare account](https://dash.cloudflare.com).
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/):
  ```bash
  npx wrangler login
  ```

### 2. Provision Cloudflare Resources

Run the following commands to create your serverless resources:

```bash
# 1. Create Cloudflare D1 Database
npx wrangler d1 create dossier-db

# 2. Create Cloudflare R2 Storage Bucket
npx wrangler r2 bucket create dossier-storage

# 3. Create Cloudflare KV Namespace for Cache
npx wrangler kv namespace create dossier-next-cache-kv
```

Copy the generated database ID and KV namespace ID into `wrangler.jsonc`:
- `database_id` under `d1_databases`
- `id` under `kv_namespaces`

### 3. Synchronize & Apply Migrations

Dossier derives its SQLite schema directly from the Prisma PostgreSQL definition. Sync and apply migrations to your remote D1 database:

```bash
yarn sync:d1
npx wrangler d1 migrations apply dossier-db --remote
```

### 4. Configure Secrets

Set your session encryption secret and login password hash:

```bash
# Generate a 32+ character random secret:
openssl rand -base64 32 | npx wrangler secret put DOSSIER_SECRET

# Hash your login password and save it:
yarn hash-password "your-strong-password" | npx wrangler secret put DOSSIER_PASSWORD
```

### 5. Build and Deploy

```bash
# Build with OpenNext
yarn build:cf

# Deploy to Cloudflare Workers
yarn deploy:cf
```

Or run the interactive assistant:
```bash
./scripts/deploy-cf.sh
```

---

## 🛠️ Feature Details

### 1. Cloudflare D1 Database (`@prisma/adapter-d1`)
When running on Cloudflare, `src/lib/database.ts` detects `env.DB` and initializes Prisma with the D1 driver adapter. All application models, queries, and relations work unchanged.

If connecting to an external PostgreSQL database (e.g. Supabase, Neon), configure a Cloudflare Hyperdrive binding (`HYPERDRIVE`) in `wrangler.jsonc` for edge connection pooling and query acceleration.

### 2. Cloudflare R2 Storage
The unified storage layer in `src/lib/storage/index.ts` automatically routes database backups and PDF export zips to your `DOSSIER_BUCKET` R2 bucket when running on Cloudflare, and seamlessly falls back to the local file system (`DOSSIER_DATA_DIR`) in local development or Docker.

### 3. Cloudflare Browser Rendering for PDFs
Headless Chromium in `src/lib/pdf/render.ts` uses Cloudflare's managed Browser Rendering (`env.MYBROWSER`) via `@cloudflare/puppeteer`. Custom fonts and print CSS stylesheets render with pixel precision matching preview screens.

### 4. Cloudflare Workers AI
Workers AI is available as a first-class AI provider alongside OpenAI, Anthropic, and Ollama.
- **Default model**: `@cf/meta/llama-3.3-70b-instruct` (128k context, strong structured output for resume tailoring and cover letters).
- **Fast extraction**: `@cf/meta/llama-3.1-8b-instruct`.
- **Reasoning**: `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`.

When running on Cloudflare Workers, the native `env.AI` binding executes requests on Cloudflare GPUs without requiring external API keys.

---

## 💻 Local Development

Run the Next.js development server with Cloudflare Miniflare emulation:

```bash
yarn dev
```

Run unit and integration tests:

```bash
yarn test
```

---

## 🔄 Upstream Synchronization

Keep your fork up-to-date with upstream changes from `AienTech/dossier`:

```bash
git fetch upstream
git merge upstream/main
yarn sqlite-schema
yarn generate
yarn sync:d1
```
