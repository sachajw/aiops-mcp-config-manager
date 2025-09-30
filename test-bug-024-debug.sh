#!/bin/bash

# Debug script for Bug-024: Config changes don't persist to disk

echo "🐛 Bug-024 Debug Test: Config Persistence"
echo "=========================================="
echo ""

echo "📋 TEST PROCEDURE:"
echo ""
echo "1. Open the Visual Workspace"
echo "2. Note the current number of servers on canvas"
echo "3. Drag a new server from the library to the canvas"
echo "4. Click the 'Save Configuration' button"
echo "5. Check the console logs (detailed trace enabled)"
echo "6. Manually verify the config file on disk"
echo ""

echo "🔍 WHAT TO LOOK FOR IN CONSOLE:"
echo ""
echo "Step 1: Visual Workspace Save"
echo "  ═══════════════════════════════════════════════════════"
echo "  [VisualWorkspace] 🚀 SAVE CONFIGURATION STARTED"
echo "  - Total nodes: <should show correct count>"
echo "  - Server nodes: <should match canvas>"
echo "  - Full configuration: <JSON of all servers>"
echo ""

echo "Step 2: Store Save Config"
echo "  ═══════════════════════════════════════════════════════"
echo "  [Store] 💾 SAVE CONFIG STARTED"
echo "  - Number of servers to save: <should match canvas>"
echo "  - Full servers object: <should match what UI sent>"
echo ""

echo "Step 3: IPC Write Config"
echo "  [Store] 📤 Calling electronAPI.writeConfig with:"
echo "  - servers count: <should still match>"
echo "  - servers: <full JSON>"
echo ""

echo "Step 4: Write Config Result"
echo "  [Store] 📥 writeConfig returned:"
echo "  - success: true/false"
echo ""

echo "📁 MANUAL FILE VERIFICATION:"
echo ""
echo "After saving, check the actual config file:"
echo ""
echo "For Claude Desktop (user scope):"
echo "  cat ~/Library/Application\\ Support/Claude/claude_desktop_config.json | jq '.mcpServers | keys | length'"
echo ""
echo "This should return the SAME number as shown on the canvas."
echo ""

echo "🚨 EXPECTED ISSUE:"
echo "If Bug-024 is still present:"
echo "  - Console shows: 'Saving 14 servers'"
echo "  - Config file has: only 13 servers"
echo "  - One server is lost somewhere in the chain!"
echo ""

echo "🔧 DEBUG CHECKPOINTS:"
echo "  [ ] VisualWorkspace builds correct newServers object"
echo "  [ ] setServers() receives all servers"
echo "  [ ] Store state updates with all servers"
echo "  [ ] electronAPI.writeConfig() receives all servers"
echo "  [ ] Config file written to disk contains all servers"
echo ""
echo "The bug occurs at one of these checkpoints. The logs will reveal which one."
echo ""

echo "🚀 Starting development server with debug logging..."
echo ""

# Use port 5197 to avoid conflicts
export VITE_PORT=5197

# Start the app
npm run electron:dev

echo ""
echo "✅ Debug session complete"
echo ""
echo "📊 ANALYSIS:"
echo "Review the console logs and look for:"
echo "  1. Where the server count drops"
echo "  2. Which server is missing"
echo "  3. Any errors or warnings"
echo ""
echo "Report findings to developer with:"
echo "  - Canvas server count: <number>"
echo "  - Store server count: <number>"
echo "  - IPC server count: <number>"
echo "  - File server count: <number>"
echo "  - Missing server name: <name>"