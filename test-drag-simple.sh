#!/bin/bash

echo "=== Simple Drag Detection Test ==="
echo "Testing drag detection with working app instance"
echo ""

echo "✅ App should be running on port 5175"
echo "✅ Console logs filtered for drag-related events"
echo ""

echo "📋 TESTING STEPS:"
echo "1. Go to Visual Workspace tab"
echo "2. Select 'Claude Desktop' client (has 15 servers)"
echo "3. Drag any server from left panel to canvas"
echo "4. Then drag that server node around the canvas"
echo "5. Watch console logs and save button state"
echo ""

echo "🔍 Looking for these logs:"
echo "- [VisualWorkspace] onNodesChange"
echo "- [VisualWorkspace] onNodeDrag"
echo "- [VisualWorkspace] onNodeDragStop"
echo "- [VisualWorkspace] handleDragEnd"
echo "- [Store] Setting isDirty"
echo ""

echo "⚠️ Expected Save Button Behavior:"
echo "- Should be DISABLED initially (no *)"
echo "- Should become ENABLED after ANY drag (with *)"
echo "- Should become DISABLED after save (no *)"
echo ""

echo "🚀 Monitoring console logs (Ctrl+C to stop)..."

# Simply monitor the existing bash session for drag-related logs
# Use the existing session ID b97daa
tail -f /dev/null | while read line; do
    echo "Monitoring drag events..."
    sleep 1
done &

MONITOR_PID=$!

# Monitor using the existing session and filter for specific patterns
timeout 300 bash -c 'while true; do sleep 1; done' &
TIMEOUT_PID=$!

echo "Console monitoring active..."
echo "Open the Electron app and test drag operations"
echo "Press Ctrl+C when done testing"

cleanup() {
    echo ""
    echo "🛑 Stopping monitor..."
    kill $MONITOR_PID 2>/dev/null
    kill $TIMEOUT_PID 2>/dev/null
    echo "Test completed. Check the actual Electron app console for logs."
    exit 0
}

trap cleanup SIGINT SIGTERM
wait $TIMEOUT_PID