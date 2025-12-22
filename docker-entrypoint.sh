#!/bin/sh
set -e

# Ensure data directory exists and has correct permissions
mkdir -p /app/data
chown -R nextjs:nodejs /app/data 2>/dev/null || true

echo "Running database migrations..."

# SQLite doesn't need to wait for a separate service
# Database file is created automatically

echo "Pushing schema to SQLite database..."

# Run migrations using the installed drizzle-kit
cd /app && node_modules/.bin/drizzle-kit push

echo "Database migrations completed successfully"

# Switch to non-root user and start the application
echo "Starting application as user nextjs..."
exec su-exec nextjs "$@"
