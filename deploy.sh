#!/bin/bash

# Deployment script for Pillar Assessment Tool

echo "🚀 Starting Pillar Assessment Tool deployment..."

# Check if .env.production exists, if not create from example
if [ ! -f .env.production ]; then
    echo "📝 Creating .env.production from example..."
    cp .env.production.example .env.production
    echo "⚠️  Please edit .env.production and set a secure SESSION_SECRET before running in production!"
    echo "   You can generate a secure key with: openssl rand -base64 32"
fi

# Build and start services
echo "🏗️  Building and starting services..."
docker compose --env-file .env.production up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
docker compose ps

echo "✅ Deployment complete!"
echo "🌐 Application should be available at: http://localhost:3000"
echo "🗄️  Database (SQLite): ./data/distaf.db"
echo ""
echo "📋 Useful commands:"
echo "  View logs:           docker compose logs -f"
echo "  View app logs:       docker compose logs -f app"
echo "  Stop services:       docker compose down"
echo "  Update app:          docker compose up --build -d app"
echo "  Access database:     sqlite3 ./data/distaf.db"