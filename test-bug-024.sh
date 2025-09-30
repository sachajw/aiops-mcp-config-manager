#!/bin/bash

echo "=== Bug-024 Test Script ==="
echo "Testing config file persistence after drag-and-drop"
echo

# Choose a test config file
CONFIG_FILE="$HOME/.claude_code_config.json"
echo "📁 Monitoring config file: $CONFIG_FILE"

# Check initial state
echo
echo "📊 Initial state:"
if [ -f "$CONFIG_FILE" ]; then
    echo "File exists with $(wc -l < "$CONFIG_FILE") lines"
    INITIAL_HASH=$(md5 -q "$CONFIG_FILE")
    echo "MD5 hash: $INITIAL_HASH"
else
    echo "File does not exist"
    INITIAL_HASH=""
fi

echo
echo "🚀 Starting application..."
echo
echo "📋 Test Instructions:"
echo "1. Navigate to Visual Workspace"
echo "2. Select Claude Code as the client"
echo "3. Drag a server from library to canvas"
echo "4. Click Save Configuration button"
echo "5. Check console output for '[UnifiedConfigService] File write completed successfully'"
echo
echo "🔍 Monitoring for file changes..."

# Start the app in background
npm run electron:dev &
APP_PID=$!

# Monitor for file changes
while true; do
    sleep 2
    
    if [ -f "$CONFIG_FILE" ]; then
        CURRENT_HASH=$(md5 -q "$CONFIG_FILE")
        if [ "$CURRENT_HASH" != "$INITIAL_HASH" ]; then
            echo
            echo "✅ FILE CHANGED! New hash: $CURRENT_HASH"
            echo "📄 File now has $(wc -l < "$CONFIG_FILE") lines"
            echo "🎉 Bug-024 appears to be WORKING - config file was updated!"
            
            # Show last modification time
            echo "⏰ Last modified: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$CONFIG_FILE")"
            
            INITIAL_HASH=$CURRENT_HASH
        fi
    fi
    
    # Check if app is still running
    if ! ps -p $APP_PID > /dev/null; then
        echo "❌ App process terminated"
        break
    fi
done

echo
echo "Test script ended. Press Ctrl+C to exit."