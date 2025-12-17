#!/bin/bash

echo "=== Comprehensive Drag Detection Debug ==="
echo "Testing all drag scenarios to identify working detection methods"
echo ""

echo "🎯 Test Scenarios:"
echo "1. Drag server from library to canvas (DnD Kit)"
echo "2. Drag existing node around canvas (React Flow)"
echo "3. Multiple node selection and drag"
echo "4. Edge creation between nodes"
echo ""

echo "🔍 Detection Methods Being Tested:"
echo "- onNodesChange (React Flow)"
echo "- onNodeDrag (React Flow)"
echo "- onNodeDragStop (React Flow)"
echo "- handleDragEnd (DnD Kit)"
echo "- setDirty() calls in store"
echo ""

echo "📋 Console Log Keywords to Watch:"
echo "- '[VisualWorkspace] onNodesChange'"
echo "- '[VisualWorkspace] onNodeDrag'"
echo "- '[VisualWorkspace] onNodeDragStop'"
echo "- '[VisualWorkspace] handleDragEnd'"
echo "- '[Store] Setting isDirty'"
echo ""

echo "🚀 Starting application with enhanced logging..."

# Run with specific port to avoid conflicts and filter for relevant logs
VITE_PORT=5194 npm run electron:dev 2>&1 | grep -E "\[VisualWorkspace\]|\[Store\]|isDirty|drag|Drag|position|Position" --line-buffered &

APP_PID=$!

echo ""
echo "Application started with PID: $APP_PID"
echo ""
echo "📝 TEST INSTRUCTIONS:"
echo ""
echo "1. First Test - Library to Canvas:"
echo "   - Navigate to Visual Workspace"
echo "   - Select Claude Desktop client"
echo "   - Drag a server from left panel to canvas"
echo "   - Expected: handleDragEnd should trigger"
echo ""
echo "2. Second Test - Node Movement:"
echo "   - Drag an existing node around the canvas"
echo "   - Expected: onNodeDrag and onNodeDragStop should trigger"
echo ""
echo "3. Third Test - Save Button:"
echo "   - Check if save button becomes enabled (*)"
echo "   - Click save and see if button becomes disabled"
echo ""
echo "Press Ctrl+C when testing is complete"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping application..."
    kill $APP_PID 2>/dev/null
    echo "Debug session completed"
    exit 0
}

trap cleanup SIGINT SIGTERM
wait $APP_PID