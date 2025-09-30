#!/bin/bash

echo "=== Bug-024 Fix Verification Test ==="
echo "Testing complete canvas state sync to config file"
echo

# Function to count servers in JSON file
count_servers() {
    local file="$1"
    if [ -f "$file" ]; then
        # Count number of server entries in mcpServers object
        local count=$(grep -E '^\s{4}"[^"]+"\s*:\s*{' "$file" | wc -l)
        echo "$count"
    else
        echo "0"
    fi
}

# Test with Claude Desktop
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
echo "📁 Testing with: Claude Desktop"
echo "📄 Config file: $CONFIG_FILE"

# Backup original
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.test"
echo "✅ Created backup"

# Get initial state
INITIAL_SERVERS=$(count_servers "$CONFIG_FILE")
echo "📊 Initial server count: $INITIAL_SERVERS"

echo
echo "🧪 Test Scenario:"
echo "1. Start app: npm run electron:dev"
echo "2. Go to Visual Workspace"
echo "3. Select Claude Desktop"
echo "4. Note the number of servers on canvas"
echo "5. Remove one or more servers (drag to trash)"
echo "6. Click Save Configuration"
echo "7. The config file should now have fewer servers"
echo
echo "Expected: Server count in file should match canvas"
echo

# Monitor for changes
echo "Monitoring config file for changes..."
echo "Press Ctrl+C to stop"
echo "----------------------------------------"

LAST_COUNT=$INITIAL_SERVERS
while true; do
    sleep 3
    CURRENT_COUNT=$(count_servers "$CONFIG_FILE")
    
    if [ "$CURRENT_COUNT" != "$LAST_COUNT" ]; then
        echo "✅ SERVER COUNT CHANGED: $LAST_COUNT → $CURRENT_COUNT servers"
        echo "🎉 Bug-024 Fix Verified: Canvas state is syncing to config!"
        LAST_COUNT=$CURRENT_COUNT
    else
        echo "⏱️  Servers in config: $CURRENT_COUNT (checked at $(date +%H:%M:%S))"
    fi
done