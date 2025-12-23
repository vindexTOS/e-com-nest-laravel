#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_ENV="$ROOT_DIR/.env"

if [ ! -f "$ROOT_ENV" ]; then
    echo "⚠️  Root .env file not found. Creating from .env.example..."
    if [ -f "$ROOT_DIR/.env.example" ]; then
        cp "$ROOT_DIR/.env.example" "$ROOT_ENV"
        echo "✅ Created .env from .env.example"
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

echo "🔄 Syncing root .env to service directories..."

 if [ -d "$ROOT_DIR/api-gateway" ]; then
    cp "$ROOT_ENV" "$ROOT_DIR/api-gateway/.env" 2>/dev/null || true
    echo "✅ Synced to api-gateway/.env"
fi

 if [ -d "$ROOT_DIR/admin-service" ]; then
    cp "$ROOT_ENV" "$ROOT_DIR/admin-service/.env" 2>/dev/null || true
    echo "✅ Synced to admin-service/.env"
fi

echo "####### daisinkaa #######"

