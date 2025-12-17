#!/bin/bash

# Script to help users open My MCP Manager on macOS
echo "=========================================="
echo "  My MCP Manager - macOS Opening Helper"
echo "=========================================="
echo ""

# Remove quarantine attribute
echo "Removing macOS quarantine restrictions..."
xattr -rd com.apple.quarantine "/Applications/My MCP Manager.app" 2>/dev/null

# Clear other extended attributes that might cause issues
xattr -cr "/Applications/My MCP Manager.app" 2>/dev/null

echo "✓ Quarantine removed"
echo ""

# Open the app
echo "Opening My MCP Manager..."
open "/Applications/My MCP Manager.app"

echo ""
echo "✓ App should now be opening!"
echo ""
echo "If you still see security warnings:"
echo "1. Go to System Settings > Privacy & Security"
echo "2. Look for 'My MCP Manager' in the security section"
echo "3. Click 'Open Anyway'"
echo ""
echo "Press any key to close this window..."
read -n 1