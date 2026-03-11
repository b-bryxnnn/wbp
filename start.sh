#!/bin/sh

echo "========================================="
echo "=== WBP Vote App — Starting up...     ==="
echo "========================================="

# 1) Wait for database to be ready
echo ""
echo "=== [1/3] Waiting for database ==="
MAX_RETRIES=20
RETRY=0
until npx prisma db push --skip-generate 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: Database not reachable after $MAX_RETRIES attempts. Starting server anyway..."
    break
  fi
  echo "DB not ready (attempt $RETRY/$MAX_RETRIES), retrying in 3s..."
  sleep 3
done

# 2) Seed database (non-fatal — server starts even if seed fails)
echo ""
echo "=== [2/3] Seeding database ==="
node prisma/seed.js 2>&1 || echo "WARNING: Seed failed or already seeded — continuing..."

# 3) Start the server
echo ""
echo "=== [3/3] Starting Next.js server ==="
exec node server.js

