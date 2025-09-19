#!/bin/bash

# MCP Configuration Manager - E2E Test Runner

set -e

echo "🧪 MCP Configuration Manager - E2E Test Suite"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Electron is running with remote debugging
check_electron() {
    echo "Checking for Electron app with remote debugging..."
    if lsof -i:9222 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Electron app detected on port 9222${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Electron not detected on port 9222${NC}"
        echo "Starting Electron with remote debugging..."
        ELECTRON_DEV=true npm run electron:dev &
        ELECTRON_PID=$!
        echo "Waiting for Electron to start..."
        sleep 10
        return 0
    fi
}

# Run smoke tests
run_smoke_tests() {
    echo ""
    echo "🔥 Running Smoke Tests..."
    echo "------------------------"
    npx playwright test --project=smoke --reporter=list
    return $?
}

# Run feature tests
run_feature_tests() {
    echo ""
    echo "🎯 Running Feature Tests..."
    echo "--------------------------"
    npx playwright test --project=electron --reporter=list
    return $?
}

# Run visual tests
run_visual_tests() {
    echo ""
    echo "📸 Running Visual Regression Tests..."
    echo "------------------------------------"
    npx playwright test --project=visual --reporter=list
    return $?
}

# Run specific test file
run_specific_test() {
    echo ""
    echo "🎯 Running: $1"
    echo "------------------------------------"
    npx playwright test "$1" --reporter=list
    return $?
}

# Generate report
generate_report() {
    echo ""
    echo "📊 Generating Test Report..."
    echo "---------------------------"
    npx playwright show-report test-results/html
}

# Main execution
main() {
    # Parse arguments
    case "$1" in
        smoke)
            check_electron
            run_smoke_tests
            ;;
        features)
            check_electron
            run_feature_tests
            ;;
        visual)
            check_electron
            run_visual_tests
            ;;
        all)
            check_electron
            run_smoke_tests
            SMOKE_RESULT=$?
            run_feature_tests
            FEATURE_RESULT=$?
            run_visual_tests
            VISUAL_RESULT=$?

            echo ""
            echo "📋 Test Summary"
            echo "==============="
            if [ $SMOKE_RESULT -eq 0 ]; then
                echo -e "${GREEN}✓ Smoke tests passed${NC}"
            else
                echo -e "${RED}✗ Smoke tests failed${NC}"
            fi

            if [ $FEATURE_RESULT -eq 0 ]; then
                echo -e "${GREEN}✓ Feature tests passed${NC}"
            else
                echo -e "${RED}✗ Feature tests failed${NC}"
            fi

            if [ $VISUAL_RESULT -eq 0 ]; then
                echo -e "${GREEN}✓ Visual tests passed${NC}"
            else
                echo -e "${RED}✗ Visual tests failed${NC}"
            fi
            ;;
        report)
            generate_report
            ;;
        *)
            if [ -n "$1" ]; then
                run_specific_test "$1"
            else
                echo "Usage: $0 [smoke|features|visual|all|report|<test-file>]"
                echo ""
                echo "Options:"
                echo "  smoke     - Run smoke tests only"
                echo "  features  - Run feature tests only"
                echo "  visual    - Run visual regression tests"
                echo "  all       - Run all test suites"
                echo "  report    - Open HTML test report"
                echo "  <file>    - Run specific test file"
                echo ""
                echo "Examples:"
                echo "  $0 smoke"
                echo "  $0 all"
                echo "  $0 e2e/features/visual-workspace.e2e.ts"
                exit 1
            fi
            ;;
    esac

    # Cleanup
    if [ -n "$ELECTRON_PID" ]; then
        echo ""
        echo "Stopping Electron app..."
        kill $ELECTRON_PID 2>/dev/null || true
    fi
}

# Create test results directory
mkdir -p test-results/{screenshots,videos,traces,html}

# Run main
main "$@"