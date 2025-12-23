#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Get the project root directory (parent of cicd folder)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Sync environment variables first
if [ -f "$SCRIPT_DIR/sync-env.sh" ]; then
    echo "🔄 Syncing environment variables..."
    bash "$SCRIPT_DIR/sync-env.sh"
fi

if [ "$SKIP_GIT_PULL" != "true" ]; then
    echo "🔄 Fetching latest code..."
    git fetch origin
    
    echo "📥 Pulling latest changes..."
    git reset --hard origin/main || git reset --hard origin/master
fi

echo "🛑 Stopping existing containers..."
docker-compose down || true

echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo "▶️  Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "🗄️  Running migrations..."
docker-compose exec -T api-gateway npm run migration:run || true
docker-compose exec -T admin-service php artisan migrate --force || true

echo "📊 Container status:"
docker-compose ps

echo "✅ Deployment completed successfully!"

