#!/bin/bash

# MCP Configuration Manager - Application Validation Runner
# This script runs all critical tests to validate the application is working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${CYAN}=======================================${NC}"
echo -e "${CYAN}MCP Configuration Manager${NC}"
echo -e "${CYAN}Application Validation Suite${NC}"
echo -e "${CYAN}=======================================${NC}"
echo ""

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_file=$2
    local description=$3

    echo -e "${YELLOW}Running: ${suite_name}${NC}"
    echo -e "Description: ${description}"
    echo -e "${YELLOW}---${NC}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Run the test and capture output
    if npx playwright test "$test_file" --reporter=json > test-output.json 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}: ${suite_name}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}: ${suite_name}"
        FAILED_TESTS=$((FAILED_TESTS + 1))

        # Show brief error summary
        if [ -f test-output.json ]; then
            echo -e "${RED}Error details:${NC}"
            cat test-output.json | grep -A 2 "error" | head -10 || true
        fi
    fi
    echo ""
}

# Clean previous test results
echo -e "${BLUE}Cleaning previous test results...${NC}"
rm -rf test-results/
mkdir -p test-results/

# Check if dev server is running
echo -e "${BLUE}Checking development environment...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5175 | grep -q "200"; then
    echo -e "${GREEN}✓ Dev server is running${NC}"
else
    echo -e "${YELLOW}⚠ Dev server not detected on port 5175${NC}"
    echo -e "${YELLOW}Starting dev server in background...${NC}"
    npm run dev:renderer > /dev/null 2>&1 &
    DEV_PID=$!
    sleep 5
fi

echo ""
echo -e "${CYAN}=======================================${NC}"
echo -e "${CYAN}Running Validation Tests${NC}"
echo -e "${CYAN}=======================================${NC}"
echo ""

# Run critical path validation
run_test_suite \
    "Critical Path Validation" \
    "e2e/critical-path-validation.spec.ts" \
    "Tests core functionality: launch, client selection, server management"

# Run strict validation
run_test_suite \
    "Strict UI Validation" \
    "e2e/electron-strict-validation.spec.ts" \
    "Validates UI elements are actually present and interactive"

# Run user workflow tests
run_test_suite \
    "User Workflows" \
    "e2e/user-workflows.spec.ts" \
    "Tests common user workflows and interactions"

# Run configuration operations
echo -e "${YELLOW}Running: Configuration Operations${NC}"
echo -e "Description: Tests save, load, sync operations in isolated environment"
echo -e "${YELLOW}---${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if node test/local-comprehensive-test.js > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}: Configuration Operations"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAILED${NC}: Configuration Operations"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Generate summary report
echo -e "${CYAN}=======================================${NC}"
echo -e "${CYAN}Validation Summary${NC}"
echo -e "${CYAN}=======================================${NC}"
echo ""

echo "Total Tests Run: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
else
    echo -e "${GREEN}Failed: 0${NC}"
fi

SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

# Check test screenshots
if ls test-results/*.png 1> /dev/null 2>&1; then
    echo -e "${BLUE}Screenshots captured:${NC}"
    ls -la test-results/*.png | tail -5
    echo ""
fi

# Final verdict
echo -e "${CYAN}=======================================${NC}"
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATION TESTS PASSED${NC}"
    echo -e "${GREEN}The application is working correctly!${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo -e "${RED}${FAILED_TESTS} test suite(s) failed.${NC}"
    echo ""
    echo -e "${YELLOW}Recommended actions:${NC}"
    echo "1. Check test-results/ directory for screenshots"
    echo "2. Review individual test output above"
    echo "3. Run failing tests individually for detailed output:"
    echo "   npx playwright test <test-file> --reporter=list --headed"
    EXIT_CODE=1
fi
echo -e "${CYAN}=======================================${NC}"

# Cleanup
rm -f test-output.json

# Kill dev server if we started it
if [ ! -z "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null || true
fi

exit $EXIT_CODE