#!/bin/bash

echo "=== Bug-024 Simple Test ==="
echo "Testing if config file gets updated after save"
echo

# Test with Claude Desktop config
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
echo "📁 Testing with: Claude Desktop"
echo "📄 Config file: $CONFIG_FILE"

# Backup original
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.test"
echo "✅ Created backup: $CONFIG_FILE.backup.test"

# Get initial state
INITIAL_SIZE=$(stat -f%z "$CONFIG_FILE")
INITIAL_HASH=$(md5 -q "$CONFIG_FILE")
echo "📊 Initial file size: $INITIAL_SIZE bytes"
echo "📊 Initial MD5: $INITIAL_HASH"

echo
echo "🔍 Test Steps:"
echo "1. Start the app with: npm run electron:dev"
echo "2. Go to Visual Workspace"
echo "3. Select Claude Desktop" 
echo "4. Add/remove a server or change something"
echo "5. Click Save Configuration"
echo "6. Watch for console output showing save operations"
echo "7. Check if file size/hash changed below"
echo

# Function to check file changes
check_file() {
    CURRENT_SIZE=$(stat -f%z "$CONFIG_FILE")
    CURRENT_HASH=$(md5 -q "$CONFIG_FILE")
    CURRENT_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$CONFIG_FILE")
    
    if [ "$CURRENT_HASH" != "$INITIAL_HASH" ]; then
        echo "✅ FILE CHANGED!"
        echo "   Size: $INITIAL_SIZE → $CURRENT_SIZE bytes"
        echo "   MD5: $INITIAL_HASH → $CURRENT_HASH"
        echo "   Modified: $CURRENT_TIME"
        echo "🎉 Bug-024 Test Result: CONFIG FILE IS BEING UPDATED"
        return 0
    else
        echo "❌ No change detected (checked at $(date +%H:%M:%S))"
        return 1
    fi
}

# Start monitoring
echo "Press Ctrl+C to stop monitoring"
echo "----------------------------------------"

while true; do
    sleep 3
    check_file && break
done

echo
echo "🧹 Restoring original config..."
mv "$CONFIG_FILE.backup.test" "$CONFIG_FILE"
echo "✅ Original config restored"