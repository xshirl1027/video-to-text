#!/bin/bash

# Setup script for Video to Text Converter
echo "🎬 Video to Text Converter Setup"
echo "================================"

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file already exists"
else
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
fi

# Check if API key is configured
if grep -q "your_actual_gemini_api_key_here" .env; then
    echo ""
    echo "⚠️  IMPORTANT: You need to configure your Gemini API key!"
    echo ""
    echo "📝 Steps to configure:"
    echo "1. Visit https://makersuite.google.com/app/apikey"
    echo "2. Sign in with your Google account"
    echo "3. Create a new API key"
    echo "4. Edit the .env file and replace 'your_actual_gemini_api_key_here' with your actual API key"
    echo ""
    echo "💡 You can edit the .env file with:"
    echo "   nano .env  (or use your preferred editor)"
else
    echo "✅ API key appears to be configured"
fi

echo ""
echo "🚀 To start the development server, run:"
echo "   npm run dev"
echo ""
echo "📖 For more information, see README.md"