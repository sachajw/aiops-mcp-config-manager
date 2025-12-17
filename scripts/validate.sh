#!/bin/bash

# MCP Configuration Manager - Application Validator
# Run this to validate the application is working correctly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}MCP Configuration Manager Validator${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Check if dev server is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5175 | grep -q "200"; then
    echo -e "${GREEN}✓ Dev server running${NC}"
else
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev:renderer > /dev/null 2>&1 &
    DEV_PID=$!
    sleep 5
fi

# Run the comprehensive validation test
echo -e "${BLUE}Running application validation...${NC}"
echo ""

if npx playwright test e2e/app-validation.spec.ts --reporter=list; then
    echo ""
    echo -e "${GREEN}=======================================${NC}"
    echo -e "${GREEN}✅ APPLICATION VALIDATION PASSED${NC}"
    echo -e "${GREEN}=======================================${NC}"
    echo ""
    echo "The application is working correctly:"
    echo "  • Launches successfully"
    echo "  • UI is functional"
    echo "  • Client selection works"
    echo "  • Interactive elements respond"
    echo ""
    echo "Screenshots saved in test-results/"
    EXIT_CODE=0
else
    echo ""
    echo -e "${RED}=======================================${NC}"
    echo -e "${RED}❌ APPLICATION VALIDATION FAILED${NC}"
    echo -e "${RED}=======================================${NC}"
    echo ""
    echo "Check test-results/ for screenshots"
    echo "Run with --headed flag for visual debugging:"
    echo "  npx playwright test e2e/app-validation.spec.ts --headed"
    EXIT_CODE=1
fi

# Kill dev server if we started it
if [ ! -z "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null || true
fi

exit $EXIT_CODE