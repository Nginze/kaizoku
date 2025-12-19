# Data Backup and Restore Scripts

Simple bash scripts to backup local MongoDB and Redis data and restore it to production.

## Prerequisites

- `mongodump` and `mongorestore` installed locally (MongoDB Database Tools)
- Docker running locally with `anidb-redis` container
- SSH access to production server
- Production containers named: `anidb-mongodb` and `anidb-redis`

## Quick Start

### 1. Backup Local Data

Run this on your local machine:

```bash
cd server/src/scripts
./backup-local-data.sh
```

This will:
- Create a timestamped backup directory in `./backups/YYYYMMDD-HHMMSS/`
- Export MongoDB using `mongodump`
- Copy Redis dump.rdb file from container

**Output:**
```
Backup location: ./backups/20231219-143000
```

### 2. Transfer and Restore to Production

```bash
./transfer-and-restore.sh <backup-directory> <production-server-ip> [ssh-user]
```

**Examples:**

```bash
# Using root user (default)
./transfer-and-restore.sh ./backups/20231219-143000 192.168.1.100

# Using ubuntu user
./transfer-and-restore.sh ./backups/20231219-143000 192.168.1.100 ubuntu

# Using custom user
./transfer-and-restore.sh ./backups/20231219-143000 my-server.com deploy
```

This will:
1. Transfer backup files to production server via SCP
2. Restore MongoDB data (with `--drop` flag to replace existing)
3. Stop Redis, replace dump.rdb, restart Redis
4. Clean up temporary files on remote server

## Configuration

### Change Container Names

Edit the scripts if your production containers have different names:

**In `transfer-and-restore.sh`:**
```bash
PROD_MONGO_CONTAINER="your-mongodb-container"
PROD_REDIS_CONTAINER="your-redis-container"
```

### Change Local MongoDB URI

**In `backup-local-data.sh`:**
```bash
MONGO_URI="mongodb://localhost:27017/your-database"
```

### Change Local Redis Container

**In `backup-local-data.sh`:**
```bash
REDIS_CONTAINER="your-redis-container"
```

## Verification

After restore completes, verify data on production:

```bash
# SSH into production server
ssh user@production-server

# Check MongoDB document count
docker exec anidb-mongodb mongosh anidb --eval 'db.animes.countDocuments()'

# Check Redis keys
docker exec anidb-redis redis-cli DBSIZE

# Check specific Redis cache
docker exec anidb-redis redis-cli GET "anime:featured:new"
```

## Troubleshooting

### "mongodump: command not found"

Install MongoDB Database Tools:

**macOS:**
```bash
brew install mongodb/brew/mongodb-database-tools
```

**Ubuntu/Debian:**
```bash
sudo apt-get install mongodb-database-tools
```

### "Permission denied" when copying from Redis container

Make sure Docker is running and the container name is correct:
```bash
docker ps | grep redis
```

### SSH connection issues

Test SSH access first:
```bash
ssh user@production-server
```

If using SSH keys, make sure they're added:
```bash
ssh-add ~/.ssh/your-key
```

### MongoDB restore fails

Check MongoDB is running on production:
```bash
ssh user@production-server
docker ps | grep mongodb
docker logs anidb-mongodb
```

## Safety Notes

- The MongoDB restore uses `--drop` flag which **deletes existing collections** before importing
- Redis restore **replaces the entire dump.rdb file**
- Always backup production data before running restore
- Test on a staging environment first if available

## Backup Retention

The scripts don't automatically delete old backups. Manage them manually:

```bash
# List all backups
ls -lh ./backups/

# Delete old backups (keep last 5)
cd ./backups && ls -t | tail -n +6 | xargs rm -rf
```
