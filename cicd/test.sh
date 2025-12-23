#!/bin/bash

set -e

echo "🧪 Running NestJS tests in Docker..."

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Check if api-gateway container is running
if ! docker-compose ps api-gateway | grep -q "Up"; then
    echo "⚠️  api-gateway container is not running. Starting services..."
    docker-compose up -d api-gateway
    echo "⏳ Waiting for api-gateway to be ready..."
    sleep 5
fi

echo "🔍 Running linter..."
docker-compose exec -T api-gateway npm run lint || true

echo "🧪 Running unit tests..."
docker-compose exec -T api-gateway npm test -- --coverage --passWithNoTests

echo "✅ Tests completed!"

