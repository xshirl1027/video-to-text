#!/bin/bash

# Deployment Script for Video-to-Text App

echo "🚀 Video-to-Text Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Deployment Options:"
echo "1. Deploy Frontend to Vercel"
echo "2. Deploy Backend to Railway" 
echo "3. Deploy Both (Recommended)"
echo "4. Local Development Setup"

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo "🌐 Deploying Frontend to Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "Make sure to set these environment variables in Vercel dashboard:"
        echo "- VITE_GEMINI_API_KEY: Your Google Gemini API key"
        echo "- VITE_API_URL: Your backend URL (e.g., https://your-app.railway.app)"
        echo ""
        vercel
        ;;
    2)
        echo "🐍 Deploy Backend to Railway:"
        echo "1. Go to https://railway.app"
        echo "2. Connect your GitHub repository"
        echo "3. Railway will auto-detect Python and deploy"
        echo "4. Your API will be available at: https://your-app.railway.app"
        echo ""
        echo "Environment variables are automatically set by Railway."
        ;;
    3)
        echo "🌟 Full Deployment Guide:"
        echo ""
        echo "Step 1: Deploy Backend to Railway"
        echo "- Go to https://railway.app"
        echo "- Connect your GitHub repo"
        echo "- Railway auto-deploys the Flask API"
        echo "- Note your Railway app URL"
        echo ""
        echo "Step 2: Deploy Frontend to Vercel"
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        echo "- Set VITE_API_URL to your Railway URL"
        echo "- Set VITE_GEMINI_API_KEY to your API key"
        echo ""
        read -p "Press Enter to deploy to Vercel..."
        vercel
        ;;
    4)
        echo "🛠️ Setting up Local Development..."
        
        # Check Python dependencies
        if [ ! -f "requirements.txt" ]; then
            echo "❌ requirements.txt not found"
            exit 1
        fi
        
        echo "Installing Python dependencies..."
        pip install -r requirements.txt
        
        # Check FFmpeg
        if ! command -v ffmpeg &> /dev/null; then
            echo "Installing FFmpeg..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                brew install ffmpeg
            else
                echo "Please install FFmpeg manually for your system"
            fi
        fi
        
        # Check Node dependencies
        echo "Installing Node.js dependencies..."
        npm install
        
        echo ""
        echo "✅ Local setup complete!"
        echo ""
        echo "To start development:"
        echo "Terminal 1: python youtube_api.py"
        echo "Terminal 2: npm run dev"
        echo ""
        echo "Frontend: http://localhost:5173"
        echo "API: http://localhost:5002"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment process completed!"
echo "📖 Check DEPLOYMENT.md for detailed instructions"