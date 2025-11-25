#!/bin/bash

# Build Release Script - Loads credentials and builds signed app

set -e  # Exit on error

# Load environment variables from .env.local
if [ -f .env.local ]; then
    echo "Loading credentials from .env.local..."
    export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
    echo "✓ Credentials loaded"
else
    echo "Error: .env.local not found"
    echo "Please create .env.local with your Apple Developer credentials"
    exit 1
fi

# Verify required environment variables
if [ -z "$APPLE_ID" ]; then
    echo "Error: APPLE_ID not set in .env.local"
    exit 1
fi

if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
    echo "Error: APPLE_APP_SPECIFIC_PASSWORD not set in .env.local"
    exit 1
fi

if [ -z "$APPLE_TEAM_ID" ]; then
    echo "Error: APPLE_TEAM_ID not set in .env.local"
    exit 1
fi

if [ -z "$CSC_LINK" ]; then
    echo "Error: CSC_LINK not set in .env.local"
    exit 1
fi

if [ -z "$CSC_KEY_PASSWORD" ]; then
    echo "Error: CSC_KEY_PASSWORD not set in .env.local"
    exit 1
fi

# Verify certificate file exists
if [ ! -f "$CSC_LINK" ]; then
    echo "Error: Certificate file not found at: $CSC_LINK"
    exit 1
fi

echo ""
echo "Building with notarization..."
echo "  Apple ID: $APPLE_ID"
echo "  Team ID: $APPLE_TEAM_ID"
echo "  Certificate: $CSC_LINK"
echo ""

# Run the build
npm run electron:dist

echo ""
echo "✓ Build complete!"
echo ""
echo "DMG files created in release/ directory:"
ls -lh release/*.dmg