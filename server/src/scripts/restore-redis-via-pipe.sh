#!/bin/bash

# Alternative Redis restore script using redis-cli pipe
# This reads the RDB dump and pipes data directly to Redis

set -e

BACKUP_FILE=$1
REDIS_HOST=${2:-localhost}
REDIS_PORT=${3:-6379}

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <redis-dump.rdb> [host] [port]"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "========================================="
echo "Redis Restore via Pipe"
echo "========================================="
echo "Backup file: $BACKUP_FILE"
echo "Target: $REDIS_HOST:$REDIS_PORT"
echo ""

# Use rdb-tools to convert RDB to Redis protocol and pipe to redis-cli
# If rdb-tools is not available, we'll use a different method

if command -v rdb >/dev/null 2>&1; then
    echo "Using rdb-tools to restore..."
    rdb --command protocol "$BACKUP_FILE" | redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --pipe
else
    echo "Error: rdb-tools not found. Please install with: pip install rdbtools"
    echo ""
    echo "Alternative: Transfer the dump file and use DEBUG RELOAD"
    exit 1
fi

echo "✓ Redis restore complete"
echo ""
echo "Verifying..."
DBSIZE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DBSIZE)
echo "Keys in database: $DBSIZE"
