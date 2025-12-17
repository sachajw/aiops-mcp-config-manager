#!/bin/bash

# Configuration
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$DEMO_DIR/backups/$(date +%Y%m%d_%H%M%S)"
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
APP_CONFIG_DIR="$HOME/Library/Application Support/MCP Configuration Manager"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}MCP Config Manager - Demo Reset Tool${NC}"
echo "----------------------------------------"

if [ "$1" == "--backup" ]; then
    echo "Creating backup in $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "$CLAUDE_CONFIG" ]; then
        cp "$CLAUDE_CONFIG" "$BACKUP_DIR/claude_desktop_config.json"
        echo "Backed up Claude config."
    else
        echo "Claude config not found (skipping)."
    fi

    if [ -d "$APP_CONFIG_DIR" ]; then
        cp -r "$APP_CONFIG_DIR" "$BACKUP_DIR/app_config"
        echo "Backed up App config."
    else
        echo "App config dir not found (skipping)."
    fi
    
    echo -e "${GREEN}Backup complete.${NC}"
    exit 0
fi

if [ "$1" == "--clean" ]; then
    read -p "Are you sure you want to reset configs? This will delete current settings! (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi

    echo "Resetting environment..."
    
    # Reset Claude to empty/basic
    mkdir -p "$(dirname "$CLAUDE_CONFIG")"
    echo '{ "mcpServers": {} }' > "$CLAUDE_CONFIG"
    echo "Reset Claude config to empty."

    # clear App local storage/config if needed
    # For Electron apps, often deleting the storage folder is enough to reset state
    if [ -d "$APP_CONFIG_DIR" ]; then
        rm -rf "$APP_CONFIG_DIR/Local Storage"
        rm -rf "$APP_CONFIG_DIR/Session Storage"
        # We might want to keep some prefs, but for a clean demo, wiping is safer
        # rm -f "$APP_CONFIG_DIR/config.json" # Hypothetical config file
        echo "Cleared App storage (partial)."
    fi

    echo -e "${GREEN}Environment reset. Ready for demo.${NC}"
    exit 0
fi

echo "Usage: ./reset_demo.sh [--backup | --clean]"
