# Docker Deployment Guide

Complete guide for deploying the NFT Marketplace using Docker containers.

## Architecture Overview

The Docker setup includes:
- **Node.js Backend Services**: Trust Score, Event Orchestrator, Validator
- **Python AI Services**: Fraud Detector, Price Predictor
- **MongoDB**: Database for storing NFT data, events, and analytics
- **Redis**: Caching and job queue management
- **Nginx**: Reverse proxy with load balancing and SSL termination

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 20GB+ disk space

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.docker .env

# Edit .env with your configuration
# Update MongoDB passwords, Redis password, RPC URLs, etc.
```

### 2. Start Services

**Development Mode:**
```bash
# Linux/Mac
./docker-start.sh dev

# Windows
docker-start.bat dev
```

**Production Mode:**
```bash
# Linux/Mac
./docker-start.sh prod

# Windows
docker-start.bat prod
```

### 3. Verify Services

```bash
# Check all services are running
docker-compose ps

# Check service health
curl http://localhost/health
curl http://localhost:3001/health
curl http://localhost:8001/health
```

## Service Endpoints

### Direct Access (Development)
- Trust Score Service: `http://localhost:3001`
- Event Orchestrator: `http://localhost:3002`
- Validator Service: `http://localhost:3003`
- Fraud Detector: `http://localhost:8001`
- Price Predictor: `http://localhost:8002`

### Via Nginx Reverse Proxy (Recommended)
- Trust Score API: `http://localhost/api/trust-score/`
- Events API: `http://localhost/api/events/`
- Validator API: `http://localhost/api/validator/`
- Fraud Detector API: `http://localhost/api/fraud-detector/`
- Price Predictor API: `http://localhost/api/price-predictor/`

### Databases
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`

## Configuration

### Environment Variables

Key variables in `.env`:

```bash
# Database
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DB=nft_marketplace

# Redis
REDIS_PASSWORD=your_redis_password

# Blockchain
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NFT_CONTRACT_ADDRESS_SEPOLIA=0x...
MARKETPLACE_CONTRACT_ADDRESS_SEPOLIA=0x...

# Security
API_SECRET_KEY=generate_random_key_here
JWT_SECRET=generate_jwt_secret_here
```

### SSL/TLS Configuration

For production with HTTPS:

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `docker/nginx/ssl/`
3. Update `.env`:
```bash
SSL_ENABLED=true
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

4. Uncomment SSL configuration in `docker/nginx/conf.d/ssl.conf`

## Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart trust-score-service

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f fraud-detector

# Execute command in container
docker-compose exec mongodb mongosh

# Scale a service (production)
docker-compose up -d --scale trust-score-service=3
```

### Maintenance

```bash
# Remove all containers and volumes (CAUTION: deletes data)
docker-compose down -v

# Rebuild containers after code changes
docker-compose build

# Rebuild specific service
docker-compose build trust-score-service

# Pull latest images
docker-compose pull

# Prune unused Docker resources
docker system prune -a
```

### Database Access

```bash
# MongoDB shell
docker-compose exec mongodb mongosh -u admin -p

# Redis CLI
docker-compose exec redis redis-cli -a your_redis_password

# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# Restore MongoDB
docker-compose exec mongodb mongorestore /data/backup
```

## Production Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configure Production Environment

```bash
# Clone repository
git clone <your-repo-url>
cd nft-marketplace

# Setup environment
cp .env.docker .env
nano .env  # Update with production values

# Set secure permissions
chmod 600 .env
```

### 3. SSL Certificate Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem

# Set permissions
sudo chmod 644 docker/nginx/ssl/cert.pem
sudo chmod 600 docker/nginx/ssl/key.pem
```

### 4. Start Production Services

```bash
# Start with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify all services are healthy
docker-compose ps
```

### 5. Setup Monitoring

```bash
# View resource usage
docker stats

# Setup log rotation
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## Security Best Practices

1. **Change Default Passwords**: Update all passwords in `.env`
2. **Use Strong Secrets**: Generate random API keys and JWT secrets
3. **Enable SSL**: Always use HTTPS in production
4. **Firewall Rules**: Only expose necessary ports
5. **Regular Updates**: Keep Docker images updated
6. **Backup Data**: Regular MongoDB backups
7. **Monitor Logs**: Check logs for suspicious activity
8. **Rate Limiting**: Nginx includes rate limiting by default
9. **Network Isolation**: Services communicate via internal Docker network
10. **Non-Root Users**: All containers run as non-root users

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs trust-score-service

# Verify environment variables
docker-compose config
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Test connection
docker-compose exec mongodb mongosh -u admin -p

# Check network
docker network inspect nft-marketplace_nft-network
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart specific service
docker-compose restart service-name

# Adjust resource limits in docker-compose.prod.yml
```

### Port Conflicts

```bash
# Check what's using a port
netstat -tulpn | grep :3001

# Change port in docker-compose.yml
```

## Performance Optimization

### Production Settings

1. **Resource Limits**: Set in `docker-compose.prod.yml`
2. **Replicas**: Scale services horizontally
3. **Caching**: Redis caching enabled by default
4. **Connection Pooling**: MongoDB connection pooling configured
5. **Nginx Optimization**: Gzip, keepalive, buffering enabled

### Monitoring

```bash
# Real-time stats
docker stats

# Service health
curl http://localhost/health

# Database stats
docker-compose exec mongodb mongosh --eval "db.stats()"
```

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive > $BACKUP_DIR/mongodb.archive

# Backup Redis
docker-compose exec -T redis redis-cli --rdb $BACKUP_DIR/redis.rdb

# Backup environment
cp .env $BACKUP_DIR/.env.backup

echo "Backup completed: $BACKUP_DIR"
```

### Restore

```bash
# Restore MongoDB
docker-compose exec -T mongodb mongorestore --archive < /path/to/mongodb.archive

# Restore Redis
docker-compose exec -T redis redis-cli --rdb /path/to/redis.rdb
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: `docker-compose config`
3. Review this guide
4. Check Docker documentation

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MongoDB Docker](https://hub.docker.com/_/mongo)
- [Redis Docker](https://hub.docker.com/_/redis)
