#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo " Dossier Cloudflare Deployment Assistant  "
echo "=========================================="

command -v npx >/dev/null 2>&1 || { echo "npx is required but not installed. Aborting." >&2; exit 1; }

echo "1. Checking Cloudflare authentication..."
npx wrangler whoami || {
  echo "Please authenticate with Cloudflare by running: npx wrangler login"
  exit 1
}

echo ""
echo "2. Synchronizing D1 database migrations..."
yarn tsx scripts/sync-d1-migrations.ts

echo ""
echo "3. Creating Cloudflare Resources if needed..."
echo "To provision a new D1 database, R2 bucket, and KV namespace, run:"
echo "  npx wrangler d1 create dossier-db"
echo "  npx wrangler r2 bucket create dossier-storage"
echo "  npx wrangler kv namespace create dossier-next-cache-kv"
echo ""

read -p "Would you like to apply D1 migrations to remote database now? (y/N): " -r APPLY_MIG
if [[ "$APPLY_MIG" =~ ^[Yy]$ ]]; then
  echo "Applying D1 migrations to remote dossier-db..."
  npx wrangler d1 migrations apply dossier-db --remote
fi

echo ""
echo "4. Setting up Worker Secrets..."
read -p "Would you like to set or update DOSSIER_SECRET & DOSSIER_PASSWORD on Cloudflare? (y/N): " -r SET_SECRETS
if [[ "$SET_SECRETS" =~ ^[Yy]$ ]]; then
  echo "Setting DOSSIER_SECRET (generating 32-byte secure key)..."
  NEW_SECRET=$(openssl rand -base64 32)
  echo "$NEW_SECRET" | npx wrangler secret put DOSSIER_SECRET

  echo "Setting DOSSIER_PASSWORD..."
  read -sp "Enter the password you want to hash and set: " PASS_INPUT
  echo ""
  PASS_HASH=$(yarn tsx scripts/hash-password.ts "$PASS_INPUT" 2>/dev/null | grep -E '^\$2[aby]\$' || true)
  if [ -z "$PASS_HASH" ]; then
    echo "Could not hash automatically, please enter the bcrypt hash directly: "
    read -r PASS_HASH
  fi
  echo "$PASS_HASH" | npx wrangler secret put DOSSIER_PASSWORD
fi

echo ""
echo "5. Building Dossier with OpenNext Cloudflare..."
CLOUDFLARE=true OPEN_NEXT=true npx open-next build

echo ""
echo "6. Deploying Worker to Cloudflare..."
npx wrangler deploy

echo ""
echo "🎉 Deployment complete! Your Dossier instance is live on Cloudflare."
