#!/bin/bash

# Test script to monitor config file changes
echo "=== Config File Monitor ==="
echo "Watching Claude Code project config file for changes..."
echo ""

CONFIG_FILE=".claude/mcp.json"

# Show initial state
echo "Initial config file state:"
if [ -f "$CONFIG_FILE" ]; then
    echo "Size: $(stat -f%z "$CONFIG_FILE") bytes"
    echo "Modified: $(stat -f%Sm "$CONFIG_FILE")"
    echo "Server count: $(jq 'if .mcpServers then .mcpServers | length else 0 end' "$CONFIG_FILE" 2>/dev/null || echo 'N/A')"
    echo ""
else
    echo "File does not exist"
    echo ""
fi

# Monitor for changes
echo "Monitoring for changes (press Ctrl+C to stop)..."
echo "Instructions:"
echo "1. Open the app and go to Visual Workspace"
echo "2. Select Claude Code client in Project scope"
echo "3. Drag a server from the library to the canvas"
echo "4. Click Save button when it becomes active"
echo ""

# Use fswatch to monitor changes
if command -v fswatch &> /dev/null; then
    fswatch -o "$CONFIG_FILE" | while read num ; do
        echo ""
        echo "$(date '+%H:%M:%S') - FILE CHANGED!"
        echo "New size: $(stat -f%z "$CONFIG_FILE") bytes"
        echo "New modified: $(stat -f%Sm "$CONFIG_FILE")"
        echo "Server count: $(jq 'if .mcpServers then .mcpServers | length else 0 end' "$CONFIG_FILE" 2>/dev/null || echo 'N/A')"
        echo "---"
    done
else
    # Fallback to polling
    last_mod=$(stat -f%m "$CONFIG_FILE" 2>/dev/null || echo "0")
    while true; do
        current_mod=$(stat -f%m "$CONFIG_FILE" 2>/dev/null || echo "0")
        if [ "$current_mod" != "$last_mod" ]; then
            echo ""
            echo "$(date '+%H:%M:%S') - FILE CHANGED!"
            echo "New size: $(stat -f%z "$CONFIG_FILE") bytes"
            echo "New modified: $(stat -f%Sm "$CONFIG_FILE")"
            echo "Server count: $(jq 'if .mcpServers then .mcpServers | length else 0 end' "$CONFIG_FILE" 2>/dev/null || echo 'N/A')"
            echo "---"
            last_mod=$current_mod
        fi
        sleep 1
    done
fi