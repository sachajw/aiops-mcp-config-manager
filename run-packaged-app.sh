#!/bin/bash

echo "🚀 Testing packaged app locally..."

# Check if the app exists
if [ ! -d "release/mac-arm64/MCP Configuration Manager.app" ]; then
    echo "❌ App not found. Building..."
    npm run electron:pack
fi

echo "📱 Launching app..."
open "release/mac-arm64/MCP Configuration Manager.app"

echo "📋 Checking app logs..."
sleep 3
log show --predicate 'processImagePath contains "MCP Configuration Manager"' --last 30s