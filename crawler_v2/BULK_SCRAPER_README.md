# Bulk Anime Embed Scraper

A comprehensive, fault-tolerant system for scraping anime episode embeds from streaming providers and storing them in Redis cache. Designed to efficiently process 20,000+ anime with robust error handling and monitoring.

## Features

- 🚀 **Multi-worker processing** with BullMQ job queue
- 🔧 **Comprehensive error recovery** with multiple strategies
- 📊 **Real-time monitoring** and progress tracking
- ⚡ **Rate limiting** and retry mechanisms
- 🎯 **Prioritized processing** (popular/recent anime first)
- 💾 **Checkpoint system** for resumable operations
- 🔄 **Automatic recovery** for failed jobs
- 📱 **CLI interface** for easy management
- 🧹 **Cleanup tools** for maintenance

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the crawler_v2 directory:

```bash
# Database Connections
MONGO_URL=mongodb://localhost:27017/anidb
REDIS_URL=redis://localhost:6379

# Optional: Redis with authentication
# REDIS_URL=redis://username:password@localhost:6379

# Logging (optional)
LOG_LEVEL=info
```

### 3. Test Database Connections
Before running the bulk scraper, verify your database connections:

```bash
npm run test-connections
```

This will test both MongoDB and Redis connections and provide detailed feedback.

## Quick Start

### Interactive Setup (Recommended)
```bash
npm run bulk-scraper:config
```

### Start with Default Settings
```bash
npm run bulk-scraper:start
```

### Start with Custom Configuration
```bash
npm run bulk-scraper start -w 5 -m -p recent
```

## CLI Commands

### Basic Operations

| Command | Description | Example |
|---------|-------------|---------|
| `start` | Start bulk scraping | `npm run bulk-scraper start` |
| `status` | Show current status | `npm run bulk-scraper:status` |
| `monitor` | Live monitoring | `npm run bulk-scraper:monitor` |
| `pause` | Pause scraping | `npm run bulk-scraper pause` |
| `resume` | Resume scraping | `npm run bulk-scraper resume` |

### Setup & Testing

| Command | Description | Example |
|---------|-------------|---------|
| `test-connections` | Test database connections | `npm run test-connections` |
| `config` | Interactive setup | `npm run bulk-scraper:config` |

### Recovery & Maintenance

| Command | Description | Example |
|---------|-------------|---------|
| `recover` | Run auto-recovery | `npm run bulk-scraper:recover` |
| `cleanup` | Clean failed jobs | `npm run bulk-scraper:cleanup` |
| `report` | Detailed report | `npm run bulk-scraper report` |

### Start Command Options

```bash
npm run bulk-scraper start [options]

Options:
  -w, --workers <number>    Number of workers (default: 3)
  --no-resume              Don't resume from checkpoint
  -p, --priority <type>     Priority strategy: popular|recent (default: popular)
  --dry-run                Run without actual scraping
  -m, --monitoring         Enable live monitoring
  -i, --interval <seconds>  Monitoring interval (default: 10)
  -v, --verbose            Verbose logging
```

## Performance Estimates

Based on current rate limits and system capabilities:

### Processing Speed
- **Single worker**: ~3-4 anime per minute
- **3 workers**: ~32-40 hours for 20k anime
- **5 workers**: ~22-26 hours for 20k anime

### Rate Limits
- ~85 requests per minute per worker
- 15-25 requests per anime (episodes + servers + embeds)
- Built-in exponential backoff for failures

## Architecture

### Core Components

1. **BulkEmbedScraperService**: Job queue management and coordination
2. **EmbedWorker**: Individual anime processing with error handling
3. **MonitoringService**: Real-time progress tracking and health monitoring
4. **RecoveryService**: Intelligent error recovery with multiple strategies
5. **CLI Interface**: User-friendly command-line management

### Data Flow

```
MongoDB (Anime) → Job Queue → Workers → HiAnime Scraping → Redis Cache
                     ↓
            Progress Tracking & Monitoring
                     ↓
              Error Recovery & Retry
```

### Error Recovery Strategies

1. **Rate Limit Recovery**: Exponential backoff for 429 errors
2. **Mapping Recovery**: Regenerate anime mappings for provider mismatches
3. **Network Recovery**: Retry network failures with increased delays
4. **Parse Error Recovery**: Clear corrupted cache and restart
5. **Missing Anime Recovery**: Validate database integrity
6. **Generic Recovery**: Fallback strategy for unknown errors

## Monitoring

### Real-time Monitoring
```bash
npm run bulk-scraper:monitor
```

Shows live updates including:
- Progress percentage and ETA
- Success/failure rates
- Worker status and throughput
- System health metrics
- Error categorization

### Status Check
```bash
npm run bulk-scraper:status
```

Quick overview of current state:
- Total progress and completion rate
- Queue status (active, waiting, failed)
- Recovery health summary

### Detailed Report
```bash
npm run bulk-scraper report
```

Comprehensive report including:
- Detailed statistics
- Error analysis
- System performance metrics
- Recommendations

## Error Handling

### Automatic Recovery
The system automatically categorizes and recovers from:
- Rate limit errors (429 responses)
- Network timeouts and connection issues
- Mapping failures between providers
- JSON parsing errors
- Missing anime data

### Manual Recovery
```bash
# Recover all failed jobs
npm run bulk-scraper recover

# Recover specific anime by ID
npm run bulk-scraper recover --ids "123,456,789"
```

### Cleanup
```bash
# Dry run (see what would be removed)
npm run bulk-scraper cleanup

# Actually remove unrecoverable jobs
npm run bulk-scraper cleanup --no-dry-run
```

## Configuration

### Environment Variables
```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/anidb

# Logging
LOG_LEVEL=info
```

### Worker Configuration
- **3 workers**: Balanced performance and resource usage
- **5 workers**: Maximum throughput (monitor system resources)
- **1 worker**: Conservative approach for limited resources

### Priority Strategies
- **Popular**: Process high-popularity anime first
- **Recent**: Prioritize currently releasing anime

## Troubleshooting

### Common Issues

1. **High failure rate (>20%)**
   - Check internet connection stability
   - Reduce worker count to avoid rate limits
   - Run recovery process

2. **Memory usage growing**
   - Monitor with `npm run bulk-scraper:monitor`
   - Consider reducing worker count
   - Clear completed jobs from queue

3. **Slow progress**
   - Check rate limit errors in monitoring
   - Verify provider site accessibility
   - Consider adding more workers (up to 5)

4. **Redis connection issues**
   - Verify Redis server is running
   - Check connection credentials
   - Monitor Redis memory usage

### Recovery Commands
```bash
# Check recovery health
npm run bulk-scraper report

# Run automatic recovery
npm run bulk-scraper recover

# Clear all progress and restart
npm run bulk-scraper start --no-resume
```

## Programmatic Usage

For integration with other Node.js applications:

```javascript
import { BulkScraper } from './src/bulk-scraper';

const scraper = new BulkScraper();

// Start with custom configuration
await scraper.start({
  workers: 3,
  enableMonitoring: true,
  enableAutoRecovery: true,
  resumeFromCheckpoint: true
});

// Monitor progress
const progress = await scraper.getProgress();
console.log(`Progress: ${progress.completed}/${progress.totalAnime}`);

// Get detailed report
const report = await scraper.getDetailedReport();
console.log(report);

// Pause/resume
await scraper.pause();
await scraper.resume();

// Stop gracefully
await scraper.stop();
```

## Safety Features

### Graceful Shutdown
- Ctrl+C handling for clean shutdown
- Worker cleanup and job preservation
- Checkpoint saving for resumability

### Data Integrity
- Atomic Redis operations
- Verification of stored embed data
- Duplicate job prevention

### Resource Management
- Memory usage monitoring
- Queue size limits
- Connection pooling

## Performance Optimization

### For Maximum Speed
```bash
npm run bulk-scraper start -w 5 -p recent -m
```

### For Stability
```bash
npm run bulk-scraper start -w 2 -p popular
```

### For Development/Testing
```bash
npm run bulk-scraper start --dry-run -v
```

## Support

### Logs Location
Logs are output to console and can be redirected:
```bash
npm run bulk-scraper start > scraper.log 2>&1
```

### Health Checks
The monitoring system provides real-time health status:
- Redis connectivity
- Queue health (healthy/warning/critical)
- Worker status and performance
- Error rate thresholds

### Recovery Analysis
Detailed error categorization helps identify systemic issues:
- Rate limiting problems
- Network connectivity issues
- Provider-specific errors
- Data integrity problems