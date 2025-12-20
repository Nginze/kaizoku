# Proxy Setup Guide for Cloudflare Bypass

This guide explains how to set up proxy rotation using Mubeng to bypass Cloudflare blocking.

## Why Mubeng?

Your production server IP is being blocked by Cloudflare because:
- Datacenter IP detected (Hetzner)
- Missing browser fingerprints
- High request volume from single IP

**Mubeng** rotates through multiple proxy IPs to:
- Distribute requests across different IPs
- Use residential/mobile IPs that Cloudflare trusts
- Automatically rotate on every N requests

## Architecture

```
Client Request → Your Server → Rust Proxy → Mubeng → Rotating Proxies → Video Provider
```

## Getting Proxies

### Option 1: Premium Residential Proxies (Recommended)

Best for production - high success rate with Cloudflare:

1. **Bright Data** (formerly Luminati)
   - Website: https://brightdata.com
   - Pricing: Pay per GB
   - Format: `http://username-session-{random}:password@proxy.brightdata.com:22225`

2. **Smartproxy**
   - Website: https://smartproxy.com
   - Pricing: ~$75/month for 5GB
   - Format: `http://user:pass@gate.smartproxy.com:7000`

3. **Oxylabs**
   - Website: https://oxylabs.io
   - Pricing: Enterprise
   - Format: `http://customer-user:pass@pr.oxylabs.io:7777`

### Option 2: Free Proxy Lists (Testing Only)

Not recommended for production - low reliability:

- https://www.proxy-list.download/api/v1/get?type=http
- https://www.proxyscan.io/download?type=http
- https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt

## Configuration Steps

### 1. Add Proxies to proxy-list.txt

Edit `proxy-list.txt` with your proxy credentials:

```bash
# For Bright Data
http://username-session-rand12345:password@brd.superproxy.io:22225

# For Smartproxy
http://user:pass@gate.smartproxy.com:7000

# For simple HTTP proxies
http://proxy1.example.com:8080
http://user:pass@proxy2.example.com:3128
socks5://proxy3.example.com:1080
```

### 2. Test Your Proxies Locally

Before deploying, test if proxies work:

```bash
# Check which proxies are live
docker run --rm -v $(pwd)/proxy-list.txt:/proxy-list.txt \
  ghcr.io/mubeng/mubeng:latest \
  -c -f /proxy-list.txt -o /dev/stdout

# Test the rotation server
docker run --rm -p 8088:8088 -v $(pwd)/proxy-list.txt:/proxy-list.txt \
  ghcr.io/mubeng/mubeng:latest \
  -a 0.0.0.0:8088 -f /proxy-list.txt -r 1 -m random

# In another terminal, test it
curl -x http://localhost:8088 https://api.ipify.org
# Run multiple times - IP should change
```

### 3. Deploy to Production

```bash
# Copy proxy-list.txt to your server
scp proxy-list.txt user@your-server:/path/to/anidb/

# Deploy with docker compose
docker compose up -d mubeng rust-proxy
```

### 4. Verify It's Working

```bash
# Check mubeng logs
docker logs anidb-mubeng

# Test the proxy chain
docker exec anidb-server curl -x http://mubeng:8088 https://api.ipify.org

# Should see different IPs on each request
```

## Mubeng Configuration Options

In `compose.yml`, the mubeng command is:
```yaml
command: ["-a", "0.0.0.0:8088", "-f", "/proxy-list.txt", "-r", "3", "-m", "random"]
```

Options:
- `-a 0.0.0.0:8088` - Listen on all interfaces, port 8088
- `-f /proxy-list.txt` - Proxy list file
- `-r 3` - Rotate IP every 3 requests (adjust as needed)
- `-m random` - Random rotation (vs sequential)

Adjust `-r` value based on your needs:
- `-r 1` - New IP for every request (most aggressive)
- `-r 10` - New IP every 10 requests (balanced)
- `-r 100` - New IP every 100 requests (conservative)

## Troubleshooting

### Proxies Not Working

```bash
# Check mubeng is running
docker ps | grep mubeng

# View logs
docker logs anidb-mubeng --tail 50

# Verify proxy-list.txt is mounted
docker exec anidb-mubeng cat /proxy-list.txt
```

### Still Getting Blocked

1. **Use more proxies** - Add more IPs to proxy-list.txt
2. **Rotate more frequently** - Change `-r 3` to `-r 1`
3. **Use residential proxies** - Datacenter proxies still get blocked
4. **Check proxy quality** - Run mubeng in check mode

### High Latency

- Use proxies closer to video provider's region
- Increase rotation interval (`-r 10` or higher)
- Use faster proxy providers

## Cost Estimates

**Residential Proxies** (for production):
- Light usage (10GB/month): ~$50-100/month
- Medium usage (50GB/month): ~$200-400/month
- Heavy usage (200GB/month): ~$800-1500/month

**Free Proxies**:
- Cost: $0
- Reliability: Very low (10-20% uptime)
- Speed: Slow
- Blocked rate: High

## Alternative: WebShare Free Tier

WebShare offers a free tier with rotating proxies:
- Website: https://www.webshare.io
- Free tier: 10 proxies, 1GB bandwidth
- Format: `http://username:password@proxy.webshare.io:port`

Good for testing before committing to paid service.

## Security Note

**Never commit proxy-list.txt with credentials to git!**

Add to `.gitignore`:
```bash
echo "proxy-list.txt" >> .gitignore
```

Store credentials securely and sync to production separately.
