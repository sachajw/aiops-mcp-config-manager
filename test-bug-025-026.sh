#!/bin/bash

# Test script for Bug-025 (Auto-save) and Bug-026 (Canvas State Restoration)

echo "🧪 Testing Bug-025 (Auto-save) and Bug-026 (Canvas State Restoration)"
echo "======================================================================"
echo ""

echo "📋 TEST PLAN:"
echo ""
echo "Bug-025 Tests (Auto-save functionality):"
echo "  1. Enable auto-save checkbox"
echo "  2. Drag a server node to a new position"
echo "  3. Wait 30 seconds without touching anything"
echo "  4. Verify 'Saving...' indicator appears"
echo "  5. Verify config is saved to disk"
echo "  6. Make another change within 30s of first change"
echo "  7. Verify timer resets (total wait should be ~30s from last change)"
echo ""
echo "Bug-026 Tests (Canvas State Restoration):"
echo "  1. Drag multiple servers to specific positions"
echo "  2. Save configuration (manually or via auto-save)"
echo "  3. Refresh page (F5 or Cmd+R)"
echo "  4. Verify all servers restored in exact positions"
echo "  5. Close app completely"
echo "  6. Restart app"
echo "  7. Verify state still restored correctly"
echo ""

echo "🚀 Starting development server..."
echo ""

# Use port 5195 to avoid conflicts
export VITE_PORT=5195

# Start the app in development mode
npm run electron:dev

echo ""
echo "✅ Manual testing complete"
echo ""
echo "VERIFICATION CHECKLIST:"
echo "  [ ] Auto-save triggers after 30s of inactivity"
echo "  [ ] 'Saving...' indicator shows during auto-save"
echo "  [ ] Timer resets on new changes"
echo "  [ ] Node positions persist after page refresh"
echo "  [ ] Node positions persist after app restart"
echo "  [ ] No interference with manual save button"
echo "  [ ] No conflicts with JSON editor mode"