#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
    echo "Loading credentials from .env.local..."
    export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "Error: .env.local not found"
    exit 1
fi

echo "Testing connection to Apple Notarization Service..."
echo "Apple ID: $APPLE_ID"
echo "Team ID: $APPLE_TEAM_ID"
echo "----------------------------------------"

# Run notarytool history to check credentials
# We use --apple-id, --password, and --team-id flags
xcrun notarytool history --apple-id "$APPLE_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --team-id "$APPLE_TEAM_ID"

echo "----------------------------------------"
echo "Done."
