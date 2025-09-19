#!/bin/bash

# MCP Configuration Manager - Sandbox Test Runner
# This script sets up an isolated test environment for config operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}MCP Configuration Manager - Sandbox Test Runner${NC}"
echo "================================================"

# Function to print status
print_status() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Clean up function
cleanup() {
    print_status "Cleaning up sandbox environment..."

    # Remove test directories
    rm -rf "$SANDBOX_DIR/test-configs"
    rm -rf "$SANDBOX_DIR/test-data"
    rm -rf "$SANDBOX_DIR/test-output"

    # Stop any running containers
    if command -v docker &> /dev/null; then
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" down 2>/dev/null || true
    fi

    print_success "Cleanup complete"
}

# Trap cleanup on exit
trap cleanup EXIT

# Create sandbox directory structure
SANDBOX_DIR="$SCRIPT_DIR"
print_status "Setting up sandbox directory structure..."

mkdir -p "$SANDBOX_DIR/test-configs"
mkdir -p "$SANDBOX_DIR/test-data"
mkdir -p "$SANDBOX_DIR/test-output"

# Create test configuration files
print_status "Creating test configuration files..."

# Claude Desktop test config
cat > "$SANDBOX_DIR/test-configs/claude-desktop-config.json" << 'EOF'
{
  "mcpServers": {
    "test-memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "test-filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}
EOF

# Claude Code test config
cat > "$SANDBOX_DIR/test-configs/claude-code-config.json" << 'EOF'
{
  "mcpServers": {
    "test-git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "env": {
        "GIT_REPO": "/tmp/test-repo"
      }
    }
  }
}
EOF

# VS Code test config
cat > "$SANDBOX_DIR/test-configs/vscode-config.json" << 'EOF'
{
  "mcp.servers": {
    "test-server": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "/workspace"
    }
  }
}
EOF

print_success "Test configurations created"

# Check if Docker is available
if command -v docker &> /dev/null; then
    print_status "Docker detected - setting up containerized environment..."

    # Build and run Docker environment
    docker-compose -f "$SCRIPT_DIR/docker-compose.yml" build

    print_status "Running tests in Docker container..."
    docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up --exit-code-from test-env

    TEST_EXIT_CODE=$?
else
    print_status "Docker not available - running tests locally..."

    # Set up local test environment
    export NODE_ENV=test
    export TEST_MODE=sandbox
    export TEST_CONFIG_DIR="$SANDBOX_DIR/test-configs"
    export TEST_DATA_DIR="$SANDBOX_DIR/test-data"
    export TEST_OUTPUT_DIR="$SANDBOX_DIR/test-output"

    # Create temporary home directory for tests
    TEST_HOME="$SANDBOX_DIR/test-home"
    mkdir -p "$TEST_HOME/.config/mcp"
    mkdir -p "$TEST_HOME/.claude"
    mkdir -p "$TEST_HOME/.codex"
    mkdir -p "$TEST_HOME/.gemini"

    export HOME="$TEST_HOME"

    # Run unit tests
    print_status "Running unit tests..."
    cd "$PROJECT_ROOT"
    npm test -- --testPathPattern="services/__tests__" --coverage

    UNIT_TEST_EXIT_CODE=$?

    # Run integration tests
    print_status "Running integration tests..."
    npm test -- --testPathPattern="integration" --coverage

    INTEGRATION_TEST_EXIT_CODE=$?

    # Combine exit codes
    TEST_EXIT_CODE=$((UNIT_TEST_EXIT_CODE + INTEGRATION_TEST_EXIT_CODE))
fi

# Generate test report
print_status "Generating test report..."

REPORT_FILE="$SANDBOX_DIR/test-output/test-report.txt"
mkdir -p "$(dirname "$REPORT_FILE")"

cat > "$REPORT_FILE" << EOF
MCP Configuration Manager - Sandbox Test Report
================================================
Date: $(date)
Environment: ${TEST_MODE:-local}

Test Results:
-------------
EOF

if [ -f "$PROJECT_ROOT/coverage/lcov-report/index.html" ]; then
    echo "Coverage report available at: coverage/lcov-report/index.html" >> "$REPORT_FILE"
fi

# Check test results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "Status: PASSED" >> "$REPORT_FILE"
    print_success "All sandbox tests passed!"
else
    echo "Status: FAILED" >> "$REPORT_FILE"
    print_error "Some tests failed. Check the output above for details."
fi

echo "" >> "$REPORT_FILE"
echo "Test configurations used:" >> "$REPORT_FILE"
ls -la "$SANDBOX_DIR/test-configs/" >> "$REPORT_FILE"

print_status "Test report saved to: $REPORT_FILE"

# Exit with test status
exit $TEST_EXIT_CODE