#!/bin/bash

# Configuration
DEMO_DIR="demo/slides"
PUBLISH_BRANCH="gh-pages"

echo "Preparing demo for GitHub Pages..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository."
    exit 1
fi

# Ensure the demo slides exist
if [ ! -f "$DEMO_DIR/index.html" ]; then
    echo "Error: Demo slides not found in $DEMO_DIR"
    exit 1
fi

# We will use the 'subtree push' method to publish just the demo/slides folder to gh-pages branch
# This is a simple way to host the presentation

echo "Committing any pending changes to demo/slides..."
git add "$DEMO_DIR"
git commit -m "Update demo slides for publication" || true

echo "Pushing subtree to $PUBLISH_BRANCH..."
# If gh-pages doesn't exist, this might fail on first run without --prefix logic being precise if the remote isn't set up for it.
# A safer, more robust way for a local tool:
# 1. Checkout gh-pages (orphan if needed)
# 2. Clean it
# 3. Copy slides content
# 4. Push

# OR, simpler for the user: Just instructions if they don't have gh-pages set up.
# Let's try the subtree method which is standard for sub-folder deployment.

git subtree push --prefix "$DEMO_DIR" origin "$PUBLISH_BRANCH"

if [ $? -eq 0 ]; then
    echo "Successfully published to GitHub Pages!"
    echo "View at: https://<username>.github.io/mcp-config-manager/"
else
    echo "Subtree push failed. You may need to create the branch first or check remote permissions."
     echo "Alternative: Configure GitHub Pages to serve from /docs and copy slides there."
fi
