#!/bin/bash

# Test script for Bug-021: Fix infinite retry loops

echo "🧪 Testing Bug-021: Fix Infinite Retry Loops"
echo "============================================="
echo ""

echo "📋 TEST SCENARIO:"
echo "Configure a server with an invalid port to trigger connection failures"
echo "Expected behavior:"
echo "  - Max 5 retry attempts"
echo "  - Exponential backoff: 1s, 2s, 4s, 8s, 16s"
echo "  - Server marked as 'unavailable' after 5 retries"
echo "  - No more retries after marking unavailable"
echo ""

echo "🔧 SETUP INSTRUCTIONS:"
echo "1. Open the app (will start below)"
echo "2. Add a new MCP server with these settings:"
echo "   - Name: test-bad-server"
echo "   - Command: npx"
echo "   - Args: ['-y', '@modelcontextprotocol/server-memory']"
echo "   - Env: { 'PORT': '99999' }  (invalid port)"
echo "3. Save the configuration"
echo "4. Watch the console logs"
echo ""

echo "✅ VERIFICATION CHECKLIST:"
echo "  [ ] Attempt 1 at 0s (1s delay)"
echo "  [ ] Attempt 2 at ~1s (2s delay)"
echo "  [ ] Attempt 3 at ~3s (4s delay)"
echo "  [ ] Attempt 4 at ~7s (8s delay)"
echo "  [ ] Attempt 5 at ~15s (16s delay)"
echo "  [ ] Server marked as UNAVAILABLE after attempt 5"
echo "  [ ] NO more retry attempts after marking unavailable"
echo "  [ ] Console shows clear retry logging"
echo "  [ ] Total time: ~31 seconds (1+2+4+8+16)"
echo ""

echo "📊 EXPECTED CONSOLE OUTPUT:"
echo "[MCPClient] Connecting to test-bad-server... (attempt 1/6)"
echo "[MCPClient] Process exited for test-bad-server: code=1"
echo "[MCPClient] Scheduling reconnect for test-bad-server in 1000ms (attempt 1/5)"
echo "[MCPClient] Connecting to test-bad-server... (attempt 2/6)"
echo "[MCPClient] Process exited for test-bad-server: code=1"
echo "[MCPClient] Scheduling reconnect for test-bad-server in 2000ms (attempt 2/5)"
echo "... (continues for 5 attempts)"
echo "[MCPClient] Server test-bad-server marked as UNAVAILABLE after 5 failed attempts"
echo ""

# Create a test configuration file
TEST_CONFIG_DIR="/tmp/mcp-test-bug-021"
mkdir -p "$TEST_CONFIG_DIR"

cat > "$TEST_CONFIG_DIR/claude_desktop_config.json" << 'EOF'
{
  "mcpServers": {
    "test-bad-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "PORT": "99999"
      }
    }
  }
}
EOF

echo "📁 Test configuration created at: $TEST_CONFIG_DIR/claude_desktop_config.json"
echo ""

echo "🚀 Starting development server..."
echo "Use port 5196 to avoid conflicts"
echo ""

# Use unique port
export VITE_PORT=5196

# Start the app
npm run electron:dev

echo ""
echo "✅ Test complete!"
echo ""
echo "🔍 VALIDATION:"
echo "Did you observe:"
echo "  - Exactly 5 retry attempts?"
echo "  - Exponential backoff delays (1s, 2s, 4s, 8s, 16s)?"
echo "  - Server marked as unavailable?"
echo "  - No infinite retry loop?"
echo "  - Clear logging messages?"
echo ""
echo "If YES to all, Bug-021 is FIXED! ✅"