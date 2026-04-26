#!/usr/bin/env bash
set -e

echo "=== TR Farias Express — Cloudflare Setup ==="

# 1. Create D1 database
echo ""
echo "1. Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create tr-farias-express-db 2>&1)
echo "$DB_OUTPUT"

# Extract database_id from output
DB_ID=$(echo "$DB_OUTPUT" | grep 'database_id' | sed 's/.*database_id = "\(.*\)".*/\1/' | tr -d '"')

if [ -z "$DB_ID" ]; then
  # Try another format
  DB_ID=$(echo "$DB_OUTPUT" | grep -oP '(?<=database_id = ")[^"]+')
fi

if [ -z "$DB_ID" ]; then
  echo ""
  echo "Could not auto-detect database_id. Please update wrangler.toml manually."
  echo "Look for 'database_id' in the output above and replace PLACEHOLDER_RUN_SETUP_SH in wrangler.toml"
else
  echo ""
  echo "2. Updating wrangler.toml with database_id: $DB_ID"
  sed -i "s/PLACEHOLDER_RUN_SETUP_SH/$DB_ID/" wrangler.toml
fi

# 2. Generate and apply migrations
echo ""
echo "3. Generating Drizzle migrations..."
pnpm db:generate

echo ""
echo "4. Applying migrations to D1 (local)..."
for f in drizzle/*.sql; do
  echo "  Applying $f..."
  wrangler d1 execute tr-farias-express-db --local --file="$f" 2>/dev/null || true
done

echo ""
echo "5. Applying migrations to D1 (remote)..."
for f in drizzle/*.sql; do
  echo "  Applying $f..."
  wrangler d1 execute tr-farias-express-db --remote --file="$f" 2>/dev/null || true
done

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Set secrets: wrangler secret put JWT_SECRET"
echo "     and: VITE_APP_ID, OAUTH_SERVER_URL, OWNER_OPEN_ID, BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY"
echo "  2. Run: pnpm deploy"
