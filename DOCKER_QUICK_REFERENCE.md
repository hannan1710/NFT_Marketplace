# Docker Quick Reference

Essential Docker commands for the NFT Marketplace.

## Starting & Stopping

```bash
# Start all services (development)
docker-compose up -d

# Start all services (production)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart trust-score-service

# Stop specific service
docker-compose stop fraud-detector
```

## Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f trust-score-service

# Last 100 lines
docker-compose logs --tail=100 event-orchestrator

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00
```

## Service Status

```bash
# List running containers
docker-compose ps

# Detailed status
docker-compose ps -a

# Resource usage
docker stats

# Service health
curl http://localhost/health
```

## Building & Updating

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build trust-score-service

# Build without cache
docker-compose build --no-cache

# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

## Executing Commands

```bash
# MongoDB shell
docker-compose exec mongodb mongosh -u admin -p

# Redis CLI
docker-compose exec redis redis-cli -a your_password

# Node.js service shell
docker-compose exec trust-score-service sh

# Python service shell
docker-compose exec fraud-detector sh

# Run npm command
docker-compose exec trust-score-service npm install

# Run Python command
docker-compose exec fraud-detector pip list
```

## Database Operations

```bash
# MongoDB backup
docker-compose exec mongodb mongodump --out /data/backup

# MongoDB restore
docker-compose exec mongodb mongorestore /data/backup

# MongoDB stats
docker-compose exec mongodb mongosh --eval "db.stats()"

# Redis backup
docker-compose exec redis redis-cli --rdb /data/backup.rdb

# Redis info
docker-compose exec redis redis-cli info
```

## Scaling Services

```bash
# Scale to 3 instances
docker-compose up -d --scale trust-score-service=3

# Scale multiple services
docker-compose up -d --scale trust-score-service=3 --scale event-orchestrator=2
```

## Networking

```bash
# List networks
docker network ls

# Inspect network
docker network inspect nft-marketplace_nft-network

# Test connectivity
docker-compose exec trust-score-service ping mongodb
```

## Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect nft-marketplace_mongodb_data

# Remove unused volumes
docker volume prune

# Backup volume
docker run --rm -v nft-marketplace_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz /data
```

## Troubleshooting

```bash
# View container details
docker inspect <container-id>

# Check container processes
docker-compose top

# View container resource usage
docker stats --no-stream

# Check service dependencies
docker-compose config

# Validate compose file
docker-compose config --quiet

# Force recreate containers
docker-compose up -d --force-recreate
```

## Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Full cleanup (⚠️ removes everything)
docker system prune -a --volumes
```

## Environment & Configuration

```bash
# View environment variables
docker-compose exec trust-score-service env

# Validate environment file
docker-compose config

# Override environment
docker-compose --env-file .env.production up -d

# View service configuration
docker-compose config --services
```

## Security

```bash
# Scan image for vulnerabilities
docker scan nft-marketplace-trust-score-service

# Check running processes
docker-compose exec trust-score-service ps aux

# View container user
docker-compose exec trust-score-service whoami

# Check file permissions
docker-compose exec trust-score-service ls -la
```

## Performance Monitoring

```bash
# Real-time stats
docker stats

# Container resource limits
docker inspect <container-id> | grep -A 10 Resources

# Network stats
docker network inspect nft-marketplace_nft-network

# Disk usage
docker system df
```

## API Testing

```bash
# Health checks
curl http://localhost/health
curl http://localhost:3001/health
curl http://localhost:8001/health

# Trust Score API
curl http://localhost/api/trust-score/score/0x123...

# Fraud Detector API
curl -X POST http://localhost/api/fraud-detector/analyze \
  -H "Content-Type: application/json" \
  -d '{"address":"0x123..."}'

# Price Predictor API
curl -X POST http://localhost/api/price-predictor/predict \
  -H "Content-Type: application/json" \
  -d '{"tokenId":"1"}'
```

## Development Workflow

```bash
# 1. Start services
docker-compose up -d

# 2. Watch logs
docker-compose logs -f

# 3. Make code changes (auto-reload in dev mode)

# 4. Restart if needed
docker-compose restart service-name

# 5. Run tests
docker-compose exec trust-score-service npm test

# 6. Stop services
docker-compose down
```

## Production Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Update environment
nano .env

# 3. Build images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 4. Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Verify health
docker-compose ps
curl http://localhost/health

# 6. Monitor logs
docker-compose logs -f
```

## Backup & Restore

```bash
# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive > backup-$(date +%Y%m%d).archive

# Restore MongoDB
docker-compose exec -T mongodb mongorestore --archive < backup-20240101.archive

# Backup all volumes
docker run --rm -v nft-marketplace_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/volumes-backup.tar.gz /data

# Backup environment
cp .env .env.backup-$(date +%Y%m%d)
```

## Common Issues & Solutions

### Port Already in Use
```bash
# Find process using port
netstat -tulpn | grep :3001

# Change port in docker-compose.yml
ports:
  - "3005:3001"
```

### Container Keeps Restarting
```bash
# Check logs
docker-compose logs service-name

# Check health
docker inspect <container-id> | grep Health

# Disable restart
docker update --restart=no <container-id>
```

### Out of Disk Space
```bash
# Check usage
docker system df

# Clean up
docker system prune -a --volumes
```

### Slow Performance
```bash
# Check resources
docker stats

# Increase limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
alias dcp='docker-compose ps'
alias dcr='docker-compose restart'
alias dcb='docker-compose build'
alias dce='docker-compose exec'
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGO_ROOT_USER` | MongoDB admin user | `admin` |
| `MONGO_ROOT_PASSWORD` | MongoDB password | `changeme` |
| `REDIS_PASSWORD` | Redis password | `changeme` |
| `SEPOLIA_RPC_URL` | Ethereum RPC endpoint | - |
| `NFT_CONTRACT_ADDRESS_SEPOLIA` | NFT contract address | - |
| `API_SECRET_KEY` | API authentication key | - |

## Port Reference

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| Trust Score | 3001 | 3001 |
| Event Orchestrator | 3002 | 3002 |
| Validator | 3003 | 3003 |
| Fraud Detector | 8001 | 8001 |
| Price Predictor | 8002 | 8002 |
| Nginx | 80/443 | 80/443 |
| MongoDB | 27017 | 27017 |
| Redis | 6379 | 6379 |

## Support

For detailed documentation, see:
- `DOCKER_GUIDE.md` - Complete deployment guide
- `docker/README.md` - Configuration details
- `docker-compose.yml` - Service definitions
