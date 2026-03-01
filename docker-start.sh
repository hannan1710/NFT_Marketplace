#!/bin/bash

# Docker startup script for NFT Marketplace
# Usage: ./docker-start.sh [dev|prod]

set -e

MODE=${1:-dev}

echo "=========================================="
echo "NFT Marketplace Docker Startup"
echo "=========================================="
echo "Mode: $MODE"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.docker template..."
    cp .env.docker .env
    echo "✅ .env file created. Please update it with your configuration."
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Starting Docker containers..."
echo ""

if [ "$MODE" = "prod" ]; then
    echo "🚀 Starting in PRODUCTION mode..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
else
    echo "🔧 Starting in DEVELOPMENT mode..."
    docker-compose up -d
fi

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "=========================================="
echo "✅ Docker containers started successfully!"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  - Trust Score Service:    http://localhost:3001"
echo "  - Event Orchestrator:     http://localhost:3002"
echo "  - Validator Service:      http://localhost:3003"
echo "  - Fraud Detector:         http://localhost:8001"
echo "  - Price Predictor:        http://localhost:8002"
echo "  - Nginx Reverse Proxy:    http://localhost"
echo "  - MongoDB:                mongodb://localhost:27017"
echo "  - Redis:                  redis://localhost:6379"
echo ""
echo "API Endpoints (via Nginx):"
echo "  - Trust Score:            http://localhost/api/trust-score/"
echo "  - Events:                 http://localhost/api/events/"
echo "  - Validator:              http://localhost/api/validator/"
echo "  - Fraud Detector:         http://localhost/api/fraud-detector/"
echo "  - Price Predictor:        http://localhost/api/price-predictor/"
echo ""
echo "Useful commands:"
echo "  - View logs:              docker-compose logs -f [service-name]"
echo "  - Stop containers:        docker-compose down"
echo "  - Restart service:        docker-compose restart [service-name]"
echo "  - View all logs:          docker-compose logs -f"
echo ""
