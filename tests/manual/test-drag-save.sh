#!/bin/bash

# Bug-024 Test Monitor Script
# Monitors .claude/mcp.json for changes during drag-save testing

CONFIG_FILE=".claude/mcp.json"

echo "==================================="
echo "Bug-024 Config Persistence Monitor"
echo "==================================="
echo ""
echo "Monitoring: $CONFIG_FILE"
echo "Initial state:"
ls -la "$CONFIG_FILE" 2>/dev/null || echo "File not found"
echo ""
echo "Initial content:"
cat "$CONFIG_FILE" 2>/dev/null || echo "No content"
echo ""
echo "==================================="
echo "Watching for changes..."
echo "Press Ctrl+C to stop"
echo ""

# Monitor the file for changes
fswatch -o "$CONFIG_FILE" | while read event
do
    echo ""
    echo "[$(date '+%H:%M:%S')] FILE CHANGED!"
    echo "New state:"
    ls -la "$CONFIG_FILE"
    echo ""
    echo "New content:"
    cat "$CONFIG_FILE" | python3 -m json.tool 2>/dev/null || cat "$CONFIG_FILE"
    echo ""
    echo "-----------------------------------"
done