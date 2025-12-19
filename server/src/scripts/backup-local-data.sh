#!/bin/bash

# Script to backup local MongoDB and Redis data
# Run this on your local machine where data currently exists

set -e  # Exit on error

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
MONGO_URI="mongodb://admin:password@localhost:27017/anidb?authSource=admin"

echo "========================================="
echo "Starting local data backup..."
echo "========================================="
echo ""

# Create backup directory
echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
echo "✓ Backup directory created"
echo ""

# Backup MongoDB
echo "Backing up MongoDB..."
echo "URI: $MONGO_URI"
if mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/mongodb"; then
    echo "✓ MongoDB backup complete"
    echo "  Location: $BACKUP_DIR/mongodb"
else
    echo "✗ MongoDB backup failed"
    exit 1
fi
echo ""

# Backup Redis
echo "Backing up Redis..."
echo "Local Redis on localhost:6379"

# Trigger Redis SAVE command
if redis-cli SAVE; then
    echo "✓ Redis SAVE triggered"
else
    echo "✗ Redis SAVE failed"
    exit 1
fi

# Find and copy dump.rdb file
REDIS_DIR=$(redis-cli CONFIG GET dir | tail -n1)
REDIS_DUMP="$REDIS_DIR/dump.rdb"

echo "Redis data directory: $REDIS_DIR"

FOUND=false
if [ -f "$REDIS_DUMP" ]; then
    # Try copying with sudo if regular copy fails
    if cp "$REDIS_DUMP" "$BACKUP_DIR/redis-dump.rdb" 2>/dev/null; then
        echo "✓ Redis dump file copied"
        echo "  Location: $BACKUP_DIR/redis-dump.rdb"
        FOUND=true
    elif sudo cp "$REDIS_DUMP" "$BACKUP_DIR/redis-dump.rdb" 2>/dev/null && sudo chown $USER:$USER "$BACKUP_DIR/redis-dump.rdb"; then
        echo "✓ Redis dump file copied (with sudo)"
        echo "  Location: $BACKUP_DIR/redis-dump.rdb"
        FOUND=true
    fi
fi

if [ "$FOUND" = false ]; then
    echo "✗ Redis dump file not found or permission denied: $REDIS_DUMP"
    echo "  Please manually copy dump.rdb with: sudo cp $REDIS_DUMP $BACKUP_DIR/redis-dump.rdb"
fi
echo ""

# Summary
echo "========================================="
echo "Backup Complete!"
echo "========================================="
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Contents:"
ls -lh "$BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Run: ./transfer-and-restore.sh $BACKUP_DIR <production-server-ip>"
echo ""
