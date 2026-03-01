# Docker Files Index

Complete reference of all Docker-related files in the NFT Marketplace project.

## 📋 Quick Navigation

- [Core Configuration](#core-configuration)
- [Docker Images](#docker-images)
- [Nginx Configuration](#nginx-configuration)
- [Database Setup](#database-setup)
- [Scripts](#scripts)
- [Documentation](#documentation)

---

## Core Configuration

### `docker-compose.yml`
**Purpose**: Main Docker Compose configuration for all services  
**Contains**:
- Service definitions (Node.js, Python, MongoDB, Redis, Nginx)
- Network configuration
- Volume definitions
- Health checks
- Port mappings

**Services Defined**:
- `mongodb` - MongoDB database (Port 27017)
- `redis` - Redis cache/queue (Port 6379)
- `trust-score-service` - Node.js service (Port 3001)
- `event-orchestrator` - Node.js service (Port 3002)
- `validator-service` - Node.js service (Port 3003)
- `fraud-detector` - Python AI service (Port 8001)
- `price-predictor` - Python AI service (Port 8002)
- `nginx` - Reverse proxy (Port 80/443)

### `docker-compose.prod.yml`
**Purpose**: Production overrides and optimizations  
**Contains**:
- Resource limits (CPU, memory)
- Service replicas for scaling
- Production volume mounts
- Enhanced security settings
- Production-specific environment variables

**Key Features**:
- 2 replicas for Node.js services
- 2 replicas for Python services
- Strict resource limits
- Read-only volume mounts

### `.env.docker`
**Purpose**: Environment variables template  
**Contains**:
- Database credentials
- Redis password
- RPC endpoints
- Contract addresses
- API secrets
- SSL configuration
- Service ports

**Critical Variables**:
- `MONGO_ROOT_PASSWORD` - MongoDB admin password
- `REDIS_PASSWORD` - Redis authentication
- `SEPOLIA_RPC_URL` - Blockchain RPC endpoint
- `API_SECRET_KEY` - Service authentication
- `JWT_SECRET` - Token signing key

---

## Docker Images

### `docker/Dockerfile.node`
**Purpose**: Multi-stage build for Node.js services  
**Base Image**: `node:20-alpine`  
**Stages**:
1. **base** - Common dependencies
2. **development** - Full dev dependencies with hot reload
3. **build** - Production dependencies only
4. **production** - Minimal runtime image

**Features**:
- Non-root user (nodejs:1001)
- Health check included
- Optimized layer caching
- Security updates applied

**Used By**:
- trust-score-service
- event-orchestrator
- validator-service

### `docker/Dockerfile.python`
**Purpose**: Multi-stage build for Python AI services  
**Base Image**: `python:3.11-slim`  
**Stages**:
1. **base** - System dependencies
2. **development** - Full dependencies with auto-reload
3. **build** - Compiled dependencies
4. **production** - Minimal runtime image

**Features**:
- Non-root user (python)
- Health check included
- Optimized pip installation
- Model directory setup

**Used By**:
- fraud-detector
- price-predictor

### `docker/.dockerignore`
**Purpose**: Exclude files from Docker build context  
**Excludes**:
- node_modules/
- __pycache__/
- .env files
- Test files
- Documentation
- Git files
- IDE configurations

**Benefits**:
- Faster builds
- Smaller images
- Better security

---

## Nginx Configuration

### `docker/nginx/nginx.conf`
**Purpose**: Main Nginx configuration for development  
**Features**:
- Worker process optimization
- Gzip compression
- Rate limiting zones
- Upstream definitions
- Security headers
- Logging configuration

**Rate Limits**:
- API endpoints: 10 req/s
- AI endpoints: 5 req/s
- Connection limit: 10 per IP

### `docker/nginx/nginx.prod.conf`
**Purpose**: Production Nginx configuration  
**Enhancements**:
- Increased worker connections (2048)
- Stricter rate limits (20 req/s API, 10 req/s AI)
- SSL/TLS optimization
- Advanced caching
- Enhanced security headers
- HSTS enabled

### `docker/nginx/conf.d/default.conf`
**Purpose**: Service routing and proxy configuration  
**Routes**:
- `/api/trust-score/` → trust-score-service:3001
- `/api/events/` → event-orchestrator:3002
- `/api/validator/` → validator-service:3003
- `/api/fraud-detector/` → fraud-detector:8001
- `/api/price-predictor/` → price-predictor:8002
- `/health` → Health check endpoint

**Features**:
- Rate limiting per route
- Connection limits
- Proxy timeouts
- Request buffering

### `docker/nginx/conf.d/ssl.conf`
**Purpose**: HTTPS/SSL configuration  
**Features**:
- TLS 1.2 and 1.3 only
- Strong cipher suites
- OCSP stapling
- HSTS header
- HTTP to HTTPS redirect
- Let's Encrypt support

### `docker/nginx/proxy_params`
**Purpose**: Common proxy parameters  
**Settings**:
- HTTP version 1.1
- WebSocket support
- Real IP forwarding
- Proxy headers
- Timeout configuration
- Buffer settings

### `docker/nginx/ssl/` (directory)
**Purpose**: SSL certificate storage  
**Files** (not in git):
- `cert.pem` - SSL certificate
- `key.pem` - Private key
- `chain.pem` - Certificate chain (optional)

**Note**: This directory is excluded from git for security

---

## Database Setup

### `docker/mongo-init/init-mongo.js`
**Purpose**: MongoDB initialization script  
**Actions**:
1. Creates `nft_marketplace` database
2. Creates collections:
   - `trust_scores`
   - `events`
   - `nft_metadata`
   - `marketplace_listings`
   - `fraud_reports`
   - `price_predictions`
3. Creates indexes for optimal performance

**Indexes Created**:
- Unique indexes on primary keys
- Compound indexes for queries
- Time-based indexes for sorting
- Status indexes for filtering

**Runs**: Automatically on first MongoDB container start

---

## Scripts

### `docker-start.sh`
**Purpose**: Linux/Mac startup script  
**Usage**: `./docker-start.sh [dev|prod]`  
**Actions**:
1. Checks Docker installation
2. Creates .env if missing
3. Starts containers
4. Displays service URLs
5. Shows useful commands

**Modes**:
- `dev` - Development mode (default)
- `prod` - Production mode with optimizations

### `docker-start.bat`
**Purpose**: Windows startup script  
**Usage**: `docker-start.bat [dev|prod]`  
**Actions**: Same as docker-start.sh but for Windows

### `docker-verify.sh`
**Purpose**: Linux/Mac verification script  
**Usage**: `./docker-verify.sh`  
**Checks**:
- Docker installation
- Docker Compose installation
- Required files
- Environment configuration
- Port availability
- Disk space
- Memory availability
- SSL certificates

**Exit Codes**:
- 0 - All checks passed
- 1 - Errors found

### `docker-verify.bat`
**Purpose**: Windows verification script  
**Usage**: `docker-verify.bat`  
**Checks**: Same as docker-verify.sh but for Windows

---

## Documentation

### `DOCKER_GUIDE.md`
**Purpose**: Complete deployment guide  
**Sections**:
- Architecture overview
- Quick start guide
- Service endpoints
- Configuration details
- Production deployment
- Security best practices
- Troubleshooting
- Backup and recovery

**Audience**: DevOps, System Administrators

### `DOCKER_QUICK_REFERENCE.md`
**Purpose**: Command cheat sheet  
**Sections**:
- Starting & stopping
- Viewing logs
- Service status
- Building & updating
- Database operations
- Scaling services
- Troubleshooting
- API testing

**Audience**: Developers, Daily users

### `DOCKER_SECURITY_CHECKLIST.md`
**Purpose**: Security best practices  
**Sections**:
- Pre-deployment security
- Environment configuration
- SSL/TLS setup
- Network security
- Container security
- Database security
- Monitoring & logging
- Incident response

**Audience**: Security teams, DevOps

### `DOCKER_SETUP_SUMMARY.md`
**Purpose**: Overview and quick reference  
**Sections**:
- What's included
- Architecture diagram
- Quick start
- Service configuration
- Security features
- API endpoints
- Production deployment
- Troubleshooting

**Audience**: All users, Getting started

### `docker/README.md`
**Purpose**: Configuration file details  
**Sections**:
- Directory structure
- Dockerfile explanations
- Nginx configuration
- MongoDB initialization
- Security features
- Customization guide
- Best practices

**Audience**: Developers, Configuration management

### `DOCKER_FILES_INDEX.md` (this file)
**Purpose**: Complete file reference  
**Sections**:
- File listings
- Purpose descriptions
- Content summaries
- Usage notes

**Audience**: All users, Reference

---

## File Tree

```
.
├── docker-compose.yml                    # Main compose config
├── docker-compose.prod.yml               # Production overrides
├── .env.docker                           # Environment template
├── docker-start.sh                       # Linux/Mac startup
├── docker-start.bat                      # Windows startup
├── docker-verify.sh                      # Linux/Mac verification
├── docker-verify.bat                     # Windows verification
├── DOCKER_GUIDE.md                       # Complete guide
├── DOCKER_QUICK_REFERENCE.md             # Command reference
├── DOCKER_SECURITY_CHECKLIST.md          # Security guide
├── DOCKER_SETUP_SUMMARY.md               # Overview
├── DOCKER_FILES_INDEX.md                 # This file
└── docker/
    ├── Dockerfile.node                   # Node.js image
    ├── Dockerfile.python                 # Python image
    ├── .dockerignore                     # Build exclusions
    ├── README.md                         # Config details
    ├── mongo-init/
    │   └── init-mongo.js                 # MongoDB setup
    └── nginx/
        ├── nginx.conf                    # Dev config
        ├── nginx.prod.conf               # Prod config
        ├── proxy_params                  # Proxy settings
        ├── ssl/                          # Certificates (not in git)
        └── conf.d/
            ├── default.conf              # Service routing
            └── ssl.conf                  # HTTPS config
```

---

## Usage Patterns

### First Time Setup
1. Read `DOCKER_SETUP_SUMMARY.md`
2. Run `docker-verify.sh` or `docker-verify.bat`
3. Configure `.env` from `.env.docker`
4. Run `docker-start.sh dev` or `docker-start.bat dev`

### Daily Development
1. Use `DOCKER_QUICK_REFERENCE.md` for commands
2. Check logs: `docker-compose logs -f`
3. Restart services as needed

### Production Deployment
1. Follow `DOCKER_GUIDE.md` production section
2. Complete `DOCKER_SECURITY_CHECKLIST.md`
3. Use `docker-compose.prod.yml`
4. Monitor with `docker stats`

### Troubleshooting
1. Check `DOCKER_GUIDE.md` troubleshooting section
2. Review logs: `docker-compose logs service-name`
3. Verify config: `docker-compose config`

---

## Maintenance Schedule

### Daily
- Review logs for errors
- Check service health
- Monitor resource usage

### Weekly
- Update dependencies
- Review security alerts
- Backup databases

### Monthly
- Security audit
- Performance review
- Documentation updates

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

---

**Last Updated**: 2024
**Version**: 1.0.0
