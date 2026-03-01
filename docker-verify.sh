#!/bin/bash

# Docker Setup Verification Script
# Checks if all components are properly configured

set -e

echo "=========================================="
echo "Docker Setup Verification"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo "ℹ️  $1"
}

# Check Docker installation
echo "Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    success "Docker installed: $DOCKER_VERSION"
else
    error "Docker is not installed"
fi

# Check Docker Compose installation
echo ""
echo "Checking Docker Compose installation..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    success "Docker Compose installed: $COMPOSE_VERSION"
else
    error "Docker Compose is not installed"
fi

# Check if Docker is running
echo ""
echo "Checking Docker daemon..."
if docker info &> /dev/null; then
    success "Docker daemon is running"
else
    error "Docker daemon is not running"
fi

# Check for required files
echo ""
echo "Checking required files..."

FILES=(
    "docker-compose.yml"
    "docker-compose.prod.yml"
    "docker/Dockerfile.node"
    "docker/Dockerfile.python"
    "docker/nginx/nginx.conf"
    "docker/nginx/nginx.prod.conf"
    "docker/nginx/conf.d/default.conf"
    "docker/mongo-init/init-mongo.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        success "Found: $file"
    else
        error "Missing: $file"
    fi
done

# Check for .env file
echo ""
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    success "Found .env file"
    
    # Check for critical variables
    REQUIRED_VARS=(
        "MONGO_ROOT_PASSWORD"
        "REDIS_PASSWORD"
        "SEPOLIA_RPC_URL"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            VALUE=$(grep "^${var}=" .env | cut -d'=' -f2)
            if [ -z "$VALUE" ] || [ "$VALUE" = "changeme" ] || [[ "$VALUE" == *"your_"* ]]; then
                warning "$var is not properly configured"
            else
                success "$var is configured"
            fi
        else
            error "$var is missing from .env"
        fi
    done
else
    warning ".env file not found (will be created from template)"
fi

# Check Docker Compose configuration
echo ""
echo "Validating Docker Compose configuration..."
if docker-compose config &> /dev/null; then
    success "Docker Compose configuration is valid"
else
    error "Docker Compose configuration has errors"
fi

# Check available disk space
echo ""
echo "Checking disk space..."
AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -gt 20 ]; then
    success "Sufficient disk space: ${AVAILABLE_SPACE}GB available"
else
    warning "Low disk space: ${AVAILABLE_SPACE}GB available (20GB+ recommended)"
fi

# Check available memory
echo ""
echo "Checking available memory..."
if command -v free &> /dev/null; then
    AVAILABLE_MEM=$(free -g | awk '/^Mem:/{print $7}')
    if [ "$AVAILABLE_MEM" -gt 4 ]; then
        success "Sufficient memory: ${AVAILABLE_MEM}GB available"
    else
        warning "Low memory: ${AVAILABLE_MEM}GB available (4GB+ recommended)"
    fi
fi

# Check if ports are available
echo ""
echo "Checking port availability..."
PORTS=(80 443 3001 3002 3003 8001 8002 27017 6379)

for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        warning "Port $port is already in use"
    else
        success "Port $port is available"
    fi
done

# Check SSL certificates (if SSL is enabled)
echo ""
echo "Checking SSL configuration..."
if [ -f "docker/nginx/ssl/cert.pem" ] && [ -f "docker/nginx/ssl/key.pem" ]; then
    success "SSL certificates found"
    
    # Check certificate expiry
    EXPIRY=$(openssl x509 -in docker/nginx/ssl/cert.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY" ]; then
        info "Certificate expires: $EXPIRY"
    fi
else
    info "SSL certificates not found (optional for development)"
fi

# Summary
echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to deploy.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review .env configuration"
    echo "  2. Start services: ./docker-start.sh dev"
    echo "  3. Check logs: docker-compose logs -f"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo ""
    echo "You can proceed, but review the warnings above."
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Please fix the errors before deploying."
    exit 1
fi
