#!/bin/bash

# Research Agent Chat - Startup Script
echo "🚀 Starting Research Agent Chat Application..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    echo "💡 On macOS, start Docker Desktop from Applications or Launchpad"
    exit 1
fi

# Build and start the containers
echo "📦 Building and starting containers..."
docker-compose up --build

# Note: Use Ctrl+C to stop the application
