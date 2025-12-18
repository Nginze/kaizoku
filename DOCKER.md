# Docker Setup Guide

## Services Overview

This Docker Compose setup includes:
- **Redis** - Caching and job queue (port 6379)
- **MongoDB** - Anime metadata storage (port 27017)
- **Crawler** - Anime data scraping and scheduled jobs
- **Server** - API endpoints (port 3000)

## Quick Start

### Production Mode

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v
```

### Development Mode (Hot Reload)

```bash
# Start development environment
docker compose -f compose.dev.yml up -d

# View logs for specific service
docker compose -f compose.dev.yml logs -f server
docker compose -f compose.dev.yml logs -f crawler

# Stop development environment
docker compose -f compose.dev.yml down
```

## Individual Service Commands

```bash
# Rebuild specific service
docker compose build crawler
docker compose build server

# Restart specific service
docker compose restart crawler
docker compose restart server

# View logs for specific service
docker compose logs -f crawler
docker compose logs -f server
docker compose logs -f mongodb
docker compose logs -f redis

# Execute commands in running container
docker compose exec server sh
docker compose exec crawler sh
docker compose exec mongodb mongosh
docker compose exec redis redis-cli
```

## Database Management

### MongoDB

```bash
# Access MongoDB shell
docker compose exec mongodb mongosh

# Backup database
docker compose exec mongodb mongodump --out=/data/backup

# Restore database
docker compose exec mongodb mongorestore /data/backup
```

### Redis

```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Flush all Redis data
docker compose exec redis redis-cli FLUSHALL

# Monitor Redis commands
docker compose exec redis redis-cli MONITOR
```

## Troubleshooting

### View service status
```bash
docker compose ps
```

### Check service health
```bash
docker compose ps
# Look for "healthy" status for redis and mongodb
```

### Rebuild everything from scratch
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### View resource usage
```bash
docker stats
```

## Environment Variables

Make sure to configure the following in your `.env` files:

**crawler_v3/.env**
```env
MONGO_URL=mongodb://mongodb:27017/anidb
REDIS_HOST=redis
REDIS_PORT=6379
NODE_ENV=production
```

**server/.env**
```env
MONGO_URL=mongodb://mongodb:27017/anidb
REDIS_HOST=redis
REDIS_PORT=6379
PORT=3000
NODE_ENV=production
```

## Volumes

Data is persisted in Docker volumes:
- `redis_data` - Redis cache and queue data
- `mongodb_data` - MongoDB database files
- `mongodb_config` - MongoDB configuration
- `crawler_node_modules` - Crawler dependencies
- `server_node_modules` - Server dependencies

To backup volumes:
```bash
docker run --rm -v anidb_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb_backup.tar.gz /data
```

## Network

All services communicate on the `anidb-network` bridge network.

To inspect the network:
```bash
docker network inspect anidb_anidb-network
```
