# Docker Configuration Files

This directory contains all Docker-related configuration files for the NFT Marketplace.

## Directory Structure

```
docker/
├── Dockerfile.node           # Node.js services container
├── Dockerfile.python         # Python AI services container
├── .dockerignore            # Files to exclude from Docker builds
├── mongo-init/              # MongoDB initialization scripts
│   └── init-mongo.js        # Database and index setup
└── nginx/                   # Nginx reverse proxy configuration
    ├── nginx.conf           # Main Nginx config (development)
    ├── nginx.prod.conf      # Production Nginx config
    ├── proxy_params         # Common proxy parameters
    ├── ssl/                 # SSL certificates (not in git)
    └── conf.d/              # Additional configurations
        ├── default.conf     # Default server config
        └── ssl.conf         # SSL/HTTPS configuration
```

## Dockerfiles

### Dockerfile.node
Multi-stage build for Node.js services:
- **Base**: Node 20 Alpine with common dependencies
- **Development**: Full dependencies with hot reload
- **Build**: Production dependencies only
- **Production**: Minimal image with non-root user

### Dockerfile.python
Multi-stage build for Python AI services:
- **Base**: Python 3.11 slim with system dependencies
- **Development**: Full dependencies with auto-reload
- **Build**: Compiled dependencies
- **Production**: Minimal image with non-root user

## Nginx Configuration

### nginx.conf (Development)
- Basic load balancing
- Rate limiting (10 req/s for API, 5 req/s for AI)
- Connection limits
- Gzip compression
- Security headers

### nginx.prod.conf (Production)
- Enhanced performance settings
- Stricter rate limiting (20 req/s for API, 10 req/s for AI)
- SSL/TLS configuration
- Advanced caching
- Optimized timeouts and buffers

### Upstream Services
- `trust_score_backend`: Port 3001
- `event_orchestrator_backend`: Port 3002
- `validator_backend`: Port 3003
- `fraud_detector_backend`: Port 8001
- `price_predictor_backend`: Port 8002

## MongoDB Initialization

The `mongo-init/init-mongo.js` script:
- Creates the `nft_marketplace` database
- Sets up collections
- Creates indexes for optimal query performance

Collections:
- `trust_scores`: Wallet trust scores
- `events`: Blockchain events
- `nft_metadata`: NFT information
- `marketplace_listings`: Active listings
- `fraud_reports`: Fraud detection results
- `price_predictions`: Price prediction data

## Security Features

1. **Non-root Users**: All containers run as non-root
2. **Network Isolation**: Services communicate via internal network
3. **Rate Limiting**: Prevents API abuse
4. **Security Headers**: XSS, clickjacking protection
5. **SSL/TLS**: Production HTTPS support
6. **Secret Management**: Environment variables for sensitive data

## Health Checks

All services include health checks:
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3 attempts
- **Start Period**: 40 seconds

## Resource Limits (Production)

Configured in `docker-compose.prod.yml`:
- **MongoDB**: 2 CPU, 2GB RAM
- **Redis**: 1 CPU, 512MB RAM
- **Node Services**: 1 CPU, 512MB RAM each
- **Python Services**: 2 CPU, 1GB RAM each
- **Nginx**: 1 CPU, 256MB RAM

## SSL Certificate Setup

### Development (Self-Signed)
```bash
cd docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem
```

### Production (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem
```

## Customization

### Adding a New Service

1. Add service to `docker-compose.yml`:
```yaml
new-service:
  build:
    context: ./new-service
    dockerfile: ../docker/Dockerfile.node
  environment:
    PORT: 3004
  networks:
    - nft-network
```

2. Add upstream to `nginx.conf`:
```nginx
upstream new_service_backend {
    server new-service:3004;
}
```

3. Add location to `conf.d/default.conf`:
```nginx
location /api/new-service/ {
    proxy_pass http://new_service_backend/;
}
```

### Adjusting Rate Limits

Edit `nginx.conf`:
```nginx
# Change rate (requests per second)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

# Change burst size
location /api/trust-score/ {
    limit_req zone=api_limit burst=30 nodelay;
}
```

### Modifying Resource Limits

Edit `docker-compose.prod.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs service-name

# Inspect container
docker inspect container-name
```

### Network Issues
```bash
# List networks
docker network ls

# Inspect network
docker network inspect nft-marketplace_nft-network
```

### Permission Issues
```bash
# Fix ownership
sudo chown -R 1001:1001 ./service-directory
```

## Best Practices

1. **Always use .dockerignore**: Reduces build context size
2. **Multi-stage builds**: Smaller production images
3. **Health checks**: Ensure service availability
4. **Resource limits**: Prevent resource exhaustion
5. **Non-root users**: Enhanced security
6. **Volume mounts**: Persist data
7. **Environment variables**: Configuration management
8. **Logging**: Structured logs for debugging

## Maintenance

### Update Images
```bash
# Pull latest base images
docker-compose pull

# Rebuild services
docker-compose build --no-cache
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

## Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MongoDB Docker](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
