#!/bin/bash

# Clean Start Script for Video to Text Converter
echo "🧹 Cleaning up existing processes..."

# Kill any processes running on common Vite ports
echo "Checking for processes on ports 5173, 5174, 5175..."
lsof -ti:5173,5174,5175 | xargs kill -9 2>/dev/null && echo "✅ Killed existing processes" || echo "ℹ️  No processes found to kill"

# Wait a moment for processes to fully terminate
sleep 1

echo ""
echo "🚀 Starting fresh development server..."
npm run dev