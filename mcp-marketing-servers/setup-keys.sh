#!/bin/bash

# MCP Marketing Setup Script
# Run this after you get your API keys

echo "🔑 Setting up MCP Marketing Environment Variables..."

# Copy template to actual .env file
cp .env.template .env

echo "📝 Please edit the .env file with your actual API keys:"
echo "   - Get Twitter keys from: https://developer.twitter.com"
echo "   - Get OpenAI key from: https://platform.openai.com/api-keys"  
echo "   - Get GitHub token from: https://github.com/settings/tokens"

# Open .env file for editing
if command -v code &> /dev/null; then
    echo "🚀 Opening .env file in VS Code..."
    code .env
elif command -v nano &> /dev/null; then
    echo "📝 Opening .env file in nano..."
    nano .env
else
    echo "📂 Please manually edit the .env file with your API keys"
fi

echo ""
echo "✅ Once you've added your keys, run:"
echo "   source .env"
echo "   npm run test-setup"
echo ""
echo "🎯 Then we're ready to launch your marketing automation!"
