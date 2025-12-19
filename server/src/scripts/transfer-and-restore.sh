#!/bin/bash

# Script to transfer backup to production and restore data
# Usage: ./transfer-and-restore.sh <backup-directory> <production-server-ip> [ssh-user]

set -e  # Exit on error

# Arguments
BACKUP_DIR=$1
PROD_SERVER=$2
SSH_USER=${3:-root}  # Default to root if not specified

# Container names on production
PROD_MONGO_CONTAINER="anidb-mongodb"
PROD_REDIS_CONTAINER="anidb-redis"

# Validate arguments
if [ -z "$BACKUP_DIR" ] || [ -z "$PROD_SERVER" ]; then
    echo "Usage: $0 <backup-directory> <production-server-ip> [ssh-user]"
    echo ""
    echo "Example:"
    echo "  $0 ./backups/20231219-143000 192.168.1.100"
    echo "  $0 ./backups/20231219-143000 192.168.1.100 ubuntu"
    exit 1
fi

# Validate backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "========================================="
echo "Transfer and Restore to Production"
echo "========================================="
echo "Backup: $BACKUP_DIR"
echo "Server: $SSH_USER@$PROD_SERVER"
echo ""

# Step 1: Transfer backup to production server
echo "Step 1: Transferring backup to production server..."
REMOTE_BACKUP_DIR="/tmp/anidb-backup-$(date +%s)"
TEMP_LOCAL_NAME=$(basename "$BACKUP_DIR")

# Transfer the entire backup directory, then move contents
if scp -r "$BACKUP_DIR" "$SSH_USER@$PROD_SERVER:/tmp/$TEMP_LOCAL_NAME" && \
   ssh "$SSH_USER@$PROD_SERVER" "mkdir -p $REMOTE_BACKUP_DIR && mv /tmp/$TEMP_LOCAL_NAME/* $REMOTE_BACKUP_DIR/ && rmdir /tmp/$TEMP_LOCAL_NAME"; then
    echo "✓ Backup transferred to: $REMOTE_BACKUP_DIR"
else
    echo "✗ Transfer failed"
    exit 1
fi
echo ""

# Step 2: Restore MongoDB on production
echo "Step 2: Restoring MongoDB on production..."
ssh "$SSH_USER@$PROD_SERVER" << EOF
set -e

echo "Copying MongoDB backup into container..."
docker cp $REMOTE_BACKUP_DIR/mongodb/. $PROD_MONGO_CONTAINER:/tmp/mongodb-restore

echo "Importing MongoDB data..."
if docker exec -i $PROD_MONGO_CONTAINER mongorestore --uri="mongodb://localhost:27017" --drop /tmp/mongodb-restore; then
    echo "✓ MongoDB restore complete"
    # Cleanup backup from container
    docker exec $PROD_MONGO_CONTAINER rm -rf /tmp/mongodb-restore
else
    echo "✗ MongoDB restore failed"
    exit 1
fi
EOF
echo ""

# Step 3: Restore Redis on production
echo "Step 3: Restoring Redis on production..."
ssh "$SSH_USER@$PROD_SERVER" << EOF
set -e

echo "Stopping Redis container..."
docker stop $PROD_REDIS_CONTAINER

echo "Getting Redis data volume path..."
REDIS_DATA_PATH=\$(docker inspect $PROD_REDIS_CONTAINER --format='{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}')
echo "Redis data path: \$REDIS_DATA_PATH"

echo "Removing all AOF files and old dump from volume..."
rm -rf \$REDIS_DATA_PATH/appendonlydir \$REDIS_DATA_PATH/appendonly.aof* \$REDIS_DATA_PATH/dump.rdb

echo "Copying new Redis dump file to volume..."
cp $REMOTE_BACKUP_DIR/redis-dump.rdb \$REDIS_DATA_PATH/dump.rdb
chown 999:999 \$REDIS_DATA_PATH/dump.rdb

echo "Starting Redis container WITHOUT AOF to force RDB load..."
# Get the original docker run command but override appendonly
REDIS_IMAGE=\$(docker inspect $PROD_REDIS_CONTAINER --format='{{.Config.Image}}')
REDIS_NETWORK=\$(docker inspect $PROD_REDIS_CONTAINER --format='{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}}{{end}}')

# Rename old container
docker rename $PROD_REDIS_CONTAINER ${PROD_REDIS_CONTAINER}-old

# Start new container without AOF
docker run -d \\
  --name $PROD_REDIS_CONTAINER \\
  --network \$REDIS_NETWORK \\
  -v \$REDIS_DATA_PATH:/data \\
  \$REDIS_IMAGE \\
  redis-server --appendonly no

echo "Waiting for Redis to start and load data from RDB dump..."
sleep 7

# Verify Redis loaded the data
if docker exec $PROD_REDIS_CONTAINER redis-cli ping > /dev/null 2>&1; then
    KEY_COUNT=\$(docker exec $PROD_REDIS_CONTAINER redis-cli DBSIZE)
    echo "  Keys loaded: \$KEY_COUNT"

    if [ "\$KEY_COUNT" -gt 1000 ]; then
        echo "✓ Data loaded successfully!"

        echo "Re-enabling AOF now that data is loaded..."
        docker exec $PROD_REDIS_CONTAINER redis-cli CONFIG SET appendonly yes
        docker exec $PROD_REDIS_CONTAINER redis-cli BGREWRITEAOF

        echo "Waiting for AOF rewrite to complete..."
        sleep 5

        echo "Stopping temporary container..."
        docker stop $PROD_REDIS_CONTAINER
        docker rm $PROD_REDIS_CONTAINER

        echo "Restarting with original AOF-enabled configuration..."
        docker rename ${PROD_REDIS_CONTAINER}-old $PROD_REDIS_CONTAINER
        docker start $PROD_REDIS_CONTAINER

        sleep 5
        FINAL_COUNT=\$(docker exec $PROD_REDIS_CONTAINER redis-cli DBSIZE)
        echo "✓ Redis restore complete"
        echo "  Final key count: \$FINAL_COUNT"
    else
        echo "  ⚠ Warning: Only \$KEY_COUNT keys loaded. Expected ~44,000."
        echo "  Restoring original container..."
        docker stop $PROD_REDIS_CONTAINER 2>/dev/null || true
        docker rm $PROD_REDIS_CONTAINER 2>/dev/null || true
        docker rename ${PROD_REDIS_CONTAINER}-old $PROD_REDIS_CONTAINER
        docker start $PROD_REDIS_CONTAINER
        exit 1
    fi
else
    echo "✗ Redis failed to start"
    docker stop $PROD_REDIS_CONTAINER 2>/dev/null || true
    docker rm $PROD_REDIS_CONTAINER 2>/dev/null || true
    docker rename ${PROD_REDIS_CONTAINER}-old $PROD_REDIS_CONTAINER
    docker start $PROD_REDIS_CONTAINER
    exit 1
fi
EOF
echo ""

# Step 4: Cleanup remote backup
echo "Step 4: Cleaning up remote backup..."
ssh "$SSH_USER@$PROD_SERVER" "rm -rf $REMOTE_BACKUP_DIR"
echo "✓ Cleanup complete"
echo ""

# Summary
echo "========================================="
echo "Restore Complete!"
echo "========================================="
echo ""
echo "Verification commands (run on production server):"
echo "  # Check MongoDB data:"
echo "  docker exec $PROD_MONGO_CONTAINER mongosh anidb --eval 'db.animes.countDocuments()'"
echo ""
echo "  # Check Redis keys:"
echo "  docker exec $PROD_REDIS_CONTAINER redis-cli DBSIZE"
echo ""
