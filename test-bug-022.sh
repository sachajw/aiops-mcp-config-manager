#!/bin/bash

# Test script for Bug-022: Claude Desktop Auto-Launch Prevention

echo "🧪 Testing Bug-022: Claude Desktop Auto-Launch Prevention"
echo "=========================================================="
echo ""

echo "📋 TEST SCENARIO:"
echo "Verify that Claude Desktop does NOT launch when:"
echo "  1. MCP Config Manager starts up"
echo "  2. Client detection runs"
echo "  3. Config files are read"
echo "  4. Config files are saved"
echo ""

echo "🔍 PRE-TEST CHECK:"
echo "First, make sure Claude Desktop is NOT running:"
echo ""

# Check if Claude Desktop is running
if ps aux | grep -i "Claude" | grep -v grep | grep -v "Claude Code" > /dev/null; then
  echo "⚠️  WARNING: Claude Desktop is currently running!"
  echo "   Please quit Claude Desktop before running this test."
  echo ""
  read -p "Press ENTER after closing Claude Desktop, or Ctrl+C to cancel..."
  echo ""
fi

# Verify Claude is not running
if ps aux | grep -i "Claude" | grep -v grep | grep -v "Claude Code" > /dev/null; then
  echo "❌ Claude Desktop is still running. Please close it first."
  exit 1
else
  echo "✅ Claude Desktop is not running (good starting point)"
fi

echo ""
echo "🚀 Starting MCP Config Manager..."
echo "   - Monitor console logs for 'read-only mode' messages"
echo "   - Watch Activity Monitor or run 'ps aux | grep Claude' in another terminal"
echo ""

echo "📊 EXPECTED BEHAVIOR:"
echo "  ✅ App starts successfully"
echo "  ✅ Client detection completes"
echo "  ✅ Claude Desktop config is detected"
echo "  ✅ Claude Desktop does NOT launch"
echo "  ✅ Console shows: 'Checking Claude Desktop config paths (read-only mode)'"
echo "  ✅ Console shows: 'Found config at ... (no app launch triggered)'"
echo ""

echo "🔧 MONITORING COMMANDS (run in separate terminal):"
echo "  # Watch for Claude process"
echo "  watch -n 1 'ps aux | grep -i Claude | grep -v grep | grep -v \"Claude Code\"'"
echo ""
echo "  # Count Claude processes"
echo "  ps aux | grep -i \"Claude Desktop\" | grep -v grep | wc -l"
echo ""

# Use port 5198 to avoid conflicts
export VITE_PORT=5198

echo "Starting app on port 5198..."
echo ""

# Start the app in the background so we can monitor
npm run electron:dev &
APP_PID=$!

echo ""
echo "App started with PID: $APP_PID"
echo "Waiting 10 seconds for app to fully initialize..."
sleep 10

echo ""
echo "🔍 POST-STARTUP CHECK:"
echo "Checking if Claude Desktop launched..."

if ps aux | grep -i "Claude Desktop" | grep -v grep > /dev/null; then
  echo "❌ FAIL: Claude Desktop is running!"
  echo "   Bug-022 is NOT fixed - Launch Services was triggered"
  echo ""
  echo "   Killing processes..."
  pkill -f "Claude Desktop"
  kill $APP_PID
  exit 1
else
  echo "✅ PASS: Claude Desktop did not launch"
  echo "   Bug-022 appears to be fixed!"
fi

echo ""
echo "🧹 Test complete. Stopping app..."
kill $APP_PID

echo ""
echo "✅ VALIDATION COMPLETE"
echo ""
echo "📋 CHECKLIST:"
echo "  [ ] MCP Config Manager started successfully"
echo "  [ ] Client detection completed"
echo "  [ ] Claude Desktop config was detected"
echo "  [ ] Claude Desktop did NOT launch"
echo "  [ ] Console logs show 'read-only mode' messages"
echo ""
echo "If all items are checked, Bug-022 is FIXED! ✅"
echo ""
echo "🔬 ADDITIONAL TESTS:"
echo "  1. Open Visual Workspace - should not trigger launch"
echo "  2. Save a configuration - should not trigger launch"
echo "  3. Switch between clients - should not trigger launch"
echo "  4. Run e2e tests - should not trigger launch"