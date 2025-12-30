#!/bin/bash

echo "Starting Redis migration..."
echo "From: localhost:6379"
echo "To: 46.224.117.251:6379"
echo ""

# Get all keys from local
echo "Fetching all keys from local Redis..."
redis-cli --scan > keys.txt

total=$(wc -l < keys.txt)
echo "Found $total keys to migrate"
echo ""

# Counter
count=0

# Migrate each key
while read key; do
    # Get the dump and TTL from local
    redis-cli --raw DUMP "$key" | head -c-1 > /tmp/dump_$$.txt
    ttl=$(redis-cli TTL "$key")
    
    # Convert TTL to milliseconds (Redis RESTORE uses milliseconds)
    if [ "$ttl" -eq "-1" ] || [ "$ttl" -eq "-2" ]; then
        ttl=0
    else
        ttl=$((ttl * 1000))
    fi
    
    # Restore to remote Redis
    redis-cli -h 46.224.117.251 -p 6379 -a guuk12jona --no-auth-warning \
        RESTORE "$key" $ttl "$(cat /tmp/dump_$$.txt)" REPLACE
    
    count=$((count + 1))
    
    # Progress indicator
    if [ $((count % 10)) -eq 0 ]; then
        echo "Migrated $count/$total keys..."
    fi
    
done < keys.txt

# Cleanup
rm keys.txt
rm /tmp/dump_$$.txt 2>/dev/null

echo ""
echo "Migration complete! Migrated $count keys."
echo ""

# Verify
echo "Verification:"
local_count=$(redis-cli DBSIZE)
remote_count=$(redis-cli -h 46.224.117.251 -p 6379 -a guuk12jona --no-auth-warning DBSIZE)

echo "Local key count: $local_count"
echo "Remote key count: $remote_count"