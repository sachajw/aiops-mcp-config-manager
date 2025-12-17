#!/bin/bash

# Run the full user test suite
echo "Starting Full User Test Suite..."
npx playwright test e2e/full-user-suite.spec.ts --reporter=list

if [ $? -eq 0 ]; then
    echo "✅ All user tests passed!"
    exit 0
else
    echo "❌ Some user tests failed."
    exit 1
fi
