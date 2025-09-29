#!/bin/bash

echo "=== Bug-023 Fix Test Script ==="
echo "Testing save button activation after node drag"
echo ""

echo "🔧 What this test validates:"
echo "1. Save button is initially disabled (text: 'Save Configuration')"
echo "2. After dragging a node, save button becomes enabled"
echo "3. Save button text changes to 'Save Configuration *' when dirty"
echo "4. After clicking save, button becomes disabled again"
echo ""

echo "📋 Test Instructions:"
echo "1. The app will start automatically"
echo "2. Navigate to Visual Workspace"
echo "3. Select Claude Desktop as the client"
echo "4. Drag a server from the library to the canvas"
echo "5. Observe: Save button should become enabled with '*' indicator"
echo "6. Drag any node around the canvas"
echo "7. Observe: Save button should remain enabled"
echo "8. Click the save button"
echo "9. Observe: Save button should become disabled and text removes '*'"
echo ""

echo "🚀 Starting application..."
echo ""

# Run the app in the background and capture console output
npm run electron:dev 2>&1 | grep -E "\[Store\]|\[VisualWorkspace\]|Setting isDirty|onNodesChange|position changed" &

# Store the process ID
APP_PID=$!

echo "Application started with PID: $APP_PID"
echo ""
echo "🔍 Monitoring console logs for:"
echo "  - [Store] Setting isDirty to true/false"
echo "  - [VisualWorkspace] onNodesChange called"
echo "  - [VisualWorkspace] Node position changed"
echo ""
echo "Press Ctrl+C to stop monitoring and exit"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping application..."
    kill $APP_PID 2>/dev/null
    echo "Test completed"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for user to terminate
wait $APP_PID