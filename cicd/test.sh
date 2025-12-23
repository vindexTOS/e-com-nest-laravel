#!/bin/bash

set -e

echo "🧪 Running NestJS tests..."

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT/api-gateway"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔍 Running linter..."
npm run lint || true

echo "🧪 Running service unit tests..."

# Run each service test file individually
TEST_FILES=(
    "src/infrastructure/services/products/products.service.spec.ts"
    "src/infrastructure/services/users/users.service.spec.ts"
    "src/infrastructure/services/categories/categories.service.spec.ts"
    "src/infrastructure/services/orders/orders.service.spec.ts"
    "src/infrastructure/services/auth/auth.service.spec.ts"
    "src/infrastructure/services/email/email.service.spec.ts"
    "src/infrastructure/services/notifications/notifications.service.spec.ts"
    "src/infrastructure/services/broadcasting/soketi.service.spec.ts"
)

FAILED_TESTS=0

for test_file in "${TEST_FILES[@]}"; do
    if [ -f "$test_file" ]; then
        echo ""
        echo "📝 Running: $test_file"
        if npm test -- "$test_file" --coverage --passWithNoTests; then
            echo "✅ Passed: $test_file"
        else
            echo "❌ Failed: $test_file"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo "⚠️  Test file not found: $test_file"
    fi
done

echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ $FAILED_TESTS test(s) failed"
    exit 1
fi

