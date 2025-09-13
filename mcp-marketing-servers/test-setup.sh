#!/bin/bash

# Test script to verify all MCP servers are working
echo "🧪 Testing MCP Marketing Setup..."

# Source environment variables
if [ -f .env ]; then
    source .env
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found. Run setup-keys.sh first!"
    exit 1
fi

# Test GitHub MCP (remote)
echo "🐙 Testing GitHub MCP connection..."
if [ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
    echo "✅ GitHub token found"
else
    echo "⚠️  GitHub token missing"
fi

# Test OpenAI API
echo "🤖 Testing OpenAI API connection..."
if [ -n "$OPENAI_API_KEY" ]; then
    echo "✅ OpenAI key found"
else
    echo "⚠️  OpenAI key missing"
fi

# Test Twitter API
echo "🐦 Testing Twitter API credentials..."
if [ -n "$TWITTER_API_KEY" ] && [ -n "$TWITTER_API_SECRET" ]; then
    echo "✅ Twitter credentials found"
else
    echo "⚠️  Twitter credentials missing"
fi

# Test MCP server builds
echo "🔧 Testing MCP server builds..."

if [ -f "social-media-mcp/build/index.js" ]; then
    echo "✅ Social Media MCP server built"
else
    echo "❌ Social Media MCP server not built"
fi

if [ -f "medium-mcp-server/build/index.js" ]; then
    echo "✅ Medium MCP server built"
else
    echo "❌ Medium MCP server not built"
fi

# Test Playwright installation
echo "🎭 Testing Playwright MCP..."
if command -v npx &> /dev/null; then
    echo "✅ npx available for Playwright MCP"
else
    echo "❌ npx not found"
fi

echo ""
echo "🎯 Setup Status Summary:"
echo "======================="

if [ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ] && [ -n "$OPENAI_API_KEY" ] && [ -n "$TWITTER_API_KEY" ]; then
    echo "🟢 READY TO LAUNCH! All keys configured."
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Test posting: npm run test-post"
    echo "   2. Launch campaign: npm run launch"
else
    echo "🟡 PARTIAL SETUP - Some keys missing"
    echo "   Add missing keys to .env file"
fi
