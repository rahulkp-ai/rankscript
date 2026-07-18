#!/bin/bash
# RankScript — Force clean rebuild
# Run from the RankScript project root

echo "🛑 Stopping containers..."
docker-compose down -v

echo "🗑️  Removing old images..."
docker rmi rankscript-frontend rankscript-backend 2>/dev/null || true

echo "🔨 Building with --no-cache..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up