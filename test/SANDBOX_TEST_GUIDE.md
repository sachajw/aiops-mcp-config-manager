# MCP Configuration Manager - Sandbox Test Guide

## Overview

This guide explains how to set up, invoke, and use the sandbox testing environment for the MCP Configuration Manager. The sandbox provides an isolated environment to test configuration operations without affecting your actual system configurations.

## Test Structure

```
test/
├── sandbox/                    # Docker-based sandbox environment
│   ├── docker-compose.yml     # Container configuration
│   ├── Dockerfile.test        # Test container image
│   └── run-sandbox-tests.sh   # Sandbox test runner
├── local-comprehensive-test.js # Local isolated tests
├── SANDBOX_TEST_GUIDE.md      # This guide
└── e2e/                        # End-to-end Electron tests
    ├── basic-app-test.spec.ts  # Basic functionality tests
    ├── critical-path-validation.spec.ts  # Critical path tests
    ├── electron-strict-validation.spec.ts  # Strict UI validation
    └── helpers/
        └── test-helpers.ts     # Shared test utilities
```

## 1. Local Sandbox Tests (Recommended)

### Quick Start

Run the comprehensive local tests in an isolated environment:

```bash
# Run local sandbox tests
node test/local-comprehensive-test.js
```

This will:
- Create a temporary directory in `/tmp/`
- Set up mock client configurations
- Test all CRUD operations
- Clean up automatically

### What It Tests

- ✅ Client configuration setup (Claude, VS Code, Codex, Gemini)
- ✅ Configuration save/load operations
- ✅ Server add/update/remove
- ✅ Sync between configurations
- ✅ Import/export functionality
- ✅ Error handling and recovery

### Example Output

```
============================================================
MCP Configuration Manager - Local Comprehensive Tests
============================================================

Testing Client Configuration Setup
============================================================
  Testing Create Claude Desktop config... ✓ PASS
  Testing Create Claude Code config... ✓ PASS
  Testing Create VS Code settings... ✓ PASS

Testing Configuration Operations
============================================================
  Testing Save new configuration... ✓ PASS
  Testing Update existing configuration... ✓ PASS
  ...

Test Report
============================================================
Total Tests: 20
Passed: 20
Success Rate: 100.0%
✓ ALL TESTS PASSED!
```

## 2. Docker Sandbox Environment

### Prerequisites

- Docker installed
- Docker Compose installed

### Setup and Run

```bash
# Navigate to sandbox directory
cd test/sandbox

# Run sandbox tests with Docker
./run-sandbox-tests.sh
```

### What It Provides

- Completely isolated test environment
- Clean OS-level isolation
- Consistent test results across machines
- No risk to host system configurations

### Docker Environment Structure

The Docker sandbox creates:
```
/home/testuser/
├── .config/mcp/          # Global MCP configs
├── .claude/              # Claude Code configs
├── .codex/               # Codex configs
├── .gemini/              # Gemini configs
└── test-output/          # Test results
```

## 3. End-to-End Electron Tests

### Prerequisites

```bash
# Ensure Electron app can build
npm run build

# Or run in development mode
npm run electron:dev
```

### Running E2E Tests

```bash
# Run basic app test
npx playwright test e2e/basic-app-test.spec.ts --reporter=list

# Run all critical path tests
npx playwright test e2e/critical-path-validation.spec.ts

# Run with visual browser (debugging)
npx playwright test e2e/basic-app-test.spec.ts --headed

# Run specific test
npx playwright test -g "Step 1: App loads"
```

### Common Issues and Fixes

#### Issue: Tests stuck on landing page

**Fix**: The test helpers now handle this automatically:
```typescript
import { ensureMainInterface } from './helpers/test-helpers';

// This will navigate past landing if needed
const onMain = await ensureMainInterface(window);
```

#### Issue: Client dropdown not visible

**Fix**: Ensure app is ready first:
```typescript
import { waitForAppReady } from './helpers/test-helpers';

const isReady = await waitForAppReady(window);
```

#### Issue: Viewport is null

**Fix**: This is a Playwright/Electron issue. Tests now handle this gracefully.

## 4. Complete Validation Suite

### Run All Tests

```bash
# Run the complete validation suite
./run-app-validation.sh
```

This runs:
1. Critical path validation
2. Strict UI validation
3. User workflow tests
4. Configuration operations

### Interpreting Results

```
=======================================
Validation Summary
=======================================
Total Tests Run: 4
Passed: 3
Failed: 1
Success Rate: 75.0%

❌ VALIDATION FAILED
1 test suite(s) failed.

Recommended actions:
1. Check test-results/ directory for screenshots
2. Review individual test output above
3. Run failing tests individually for detailed output
```

## 5. Manual Sandbox Testing

### Create Test Environment

```bash
# Create isolated test directory
export TEST_DIR="/tmp/mcp-manual-test-$(date +%s)"
mkdir -p "$TEST_DIR"

# Set HOME to test directory
export HOME="$TEST_DIR"

# Run the app with test environment
NODE_ENV=test npm run electron:dev
```

### Test Specific Operations

```bash
# Test configuration save
cat > "$TEST_DIR/test-config.json" << EOF
{
  "mcpServers": {
    "test-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
EOF

# Verify configuration
cat "$TEST_DIR/test-config.json"
```

### Cleanup

```bash
# Remove test directory
rm -rf "$TEST_DIR"
```

## 6. CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run sandbox tests
      run: node test/local-comprehensive-test.js

    - name: Run E2E tests
      run: |
        npm run build
        npx playwright test

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v2
      with:
        name: test-results
        path: test-results/
```

## 7. Debugging Failed Tests

### Get Detailed Output

```bash
# Run with debug logging
DEBUG=* npx playwright test e2e/basic-app-test.spec.ts

# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace test-results/trace.zip
```

### Check Screenshots

Screenshots are saved in `test-results/`:
- `step1-initial-*.png` - App launch state
- `step2-main-interface-*.png` - After navigation
- `step3-client-selected-*.png` - After client selection
- `step4-interactive-*.png` - Final state

### Common Solutions

1. **Ensure dev server is running**: `npm run dev:renderer`
2. **Clear test results**: `rm -rf test-results/`
3. **Rebuild app**: `npm run build`
4. **Check Electron logs**: Look for console errors in test output

## 8. Best Practices

1. **Always run in isolation**: Use sandbox or temporary directories
2. **Clean up after tests**: Remove test configurations
3. **Use helpers**: Leverage `test-helpers.ts` for common operations
4. **Take screenshots**: Document test state at each step
5. **Check both success and failure**: Verify operations work and fail appropriately
6. **Run regularly**: Include in CI/CD pipeline

## Summary

The sandbox test environment provides multiple levels of isolation:

- **Level 1**: Local comprehensive tests (fastest, good isolation)
- **Level 2**: Docker sandbox (best isolation, consistent)
- **Level 3**: E2E Electron tests (real app testing)

For development, use Level 1. For CI/CD, use all levels. For debugging, use Level 3 with headed mode.