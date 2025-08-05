# Queue-Based Notification System Deployment Guide

## Overview

The notification system has been refactored to use a database-backed job queue compatible with Vercel's serverless environment. This approach avoids the limitations of Vercel's free tier (no Redis, no background processes) while providing reliable, scalable notification delivery.

## Architecture

```
User Action → Enqueue Job → Database → API Trigger → Process Jobs → Send Notifications
```

### Components

1. **NotificationJob Model** (`/lib/services/notification-queue.ts`)
   - MongoDB collection for storing notification jobs
   - Built-in TTL for automatic cleanup
   - Retry logic with exponential backoff
   - Job status tracking and error history

2. **NotificationQueueProcessor** (`/lib/services/notification-queue-processor.ts`)
   - Processes jobs in batches
   - Handles different notification types
   - Implements retry logic and error handling
   - Provides statistics and monitoring

3. **PushNotificationService** (`/lib/services/push-notification-service.ts`)
   - Refactored to enqueue jobs instead of direct sending
   - Maintains same API for existing code
   - Provides queue management methods

4. **API Endpoints**
   - `POST /api/admin/queue/process` - Process notification jobs
   - `GET /api/admin/queue/process` - Get queue statistics
   - `POST /api/admin/queue/cleanup` - Clean up old jobs
   - `GET /api/admin/queue/cleanup` - Get cleanup recommendations

## Deployment Steps

### 1. Environment Variables

Ensure these are set in your Vercel environment:

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# Optional: Queue configuration
NOTIFICATION_BATCH_SIZE=10
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_JOB_TTL_HOURS=168  # 1 week
```

### 2. Database Setup

The notification job collection will be created automatically with the following indexes:

```javascript
// Automatically created indexes
{ status: 1, priority: -1, scheduledAt: 1 }  // Query performance
{ expiresAt: 1 }                            // TTL cleanup
{ userId: 1, status: 1 }                    // User-specific queries
```

### 3. Job Processing

Since Vercel doesn't support background processes, jobs are processed via API calls:

#### Option A: Manual Processing (Development)
```bash
curl -X POST https://your-app.vercel.app/api/admin/queue/process
```

#### Option B: External Cron (Production)
Set up an external cron service (e.g., GitHub Actions, cron-job.org) to call the processing endpoint:

```yaml
# .github/workflows/process-queue.yml
name: Process Notification Queue
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Process Queue
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/admin/queue/process
```

#### Option C: User-Triggered Processing
Process jobs when users interact with the app by adding this to high-traffic endpoints:

```typescript
// In your API routes
import { NotificationQueueProcessor } from '@/lib/services/notification-queue-processor';

export async function GET(request: NextRequest) {
  // Your existing logic...
  
  // Process notifications in the background
  NotificationQueueProcessor.processBatch(5).catch(console.error);
  
  return NextResponse.json(response);
}
```

### 4. Monitoring and Maintenance

#### Queue Statistics
```bash
curl https://your-app.vercel.app/api/admin/queue/process
```

#### Cleanup Old Jobs
```bash
curl -X POST https://your-app.vercel.app/api/admin/queue/cleanup \
  -H "Content-Type: application/json" \
  -d '{"olderThanHours": 48}'
```

### 5. Testing

Run the test suite to verify everything works:

```bash
npx tsx scripts/test-notification-queue.ts
```

## Performance Considerations

### Batch Processing
- Default batch size: 10 jobs per request
- Adjustable via environment variable or API parameter
- Balances processing speed with function timeout limits

### Memory Usage
- Jobs are processed sequentially to avoid memory spikes
- Failed jobs are marked for retry with exponential backoff
- Completed jobs are cleaned up automatically

### Database Performance
- Optimized queries with compound indexes
- TTL index for automatic cleanup
- Aggregation pipelines for statistics

## Error Handling

### Job Failures
- Failed jobs are automatically retried up to 3 times
- Exponential backoff prevents overwhelming external services
- Error history is preserved for debugging

### API Failures
- All endpoints return detailed error information
- Processing continues even if individual jobs fail
- Graceful degradation ensures core app functionality

### Database Issues
- Connection pooling handles temporary disconnections
- Retry logic for database operations
- Fallback error reporting

## Security

### Access Control
- Admin endpoints should be protected with authentication
- Consider IP whitelisting for cron job endpoints
- Rate limiting to prevent abuse

### Data Privacy
- Notification payloads can contain sensitive information
- Consider encryption for sensitive data fields
- Regular cleanup prevents data accumulation

## Scaling Considerations

### Horizontal Scaling
- Multiple Vercel functions can process jobs concurrently
- Database handles concurrent access with proper indexing
- No shared state between function instances

### Vertical Scaling
- Increase batch size for higher throughput
- Monitor function execution time and memory usage
- Consider database connection limits

### Cost Optimization
- Regular cleanup reduces storage costs
- Efficient queries minimize database operations
- Batch processing reduces function invocations

## Migration from Direct Sending

The refactored system maintains backward compatibility:

```typescript
// Old code (still works)
await PushNotificationService.sendAuthorizationRequest(/* ... */);

// New code (same result, but queued)
await PushNotificationService.sendAuthorizationRequest(/* ... */);
```

Existing code doesn't need changes - notifications are now automatically queued for processing.

## Troubleshooting

### No Jobs Processing
1. Check if processing endpoint is being called
2. Verify database connectivity
3. Review job statuses in database

### High Failure Rate
1. Check external service availability
2. Review error logs in job history
3. Adjust retry settings if needed

### Performance Issues
1. Monitor database query performance
2. Adjust batch size
3. Check function execution time

### Queue Backup
1. Increase processing frequency
2. Check for stuck jobs in processing state
3. Consider horizontal scaling

## Next Steps

1. **Device Registration**: Implement device token management for actual push notifications
2. **Real Push Service**: Replace simulation with actual push notification service (FCM, APNS)
3. **Advanced Monitoring**: Add metrics and alerting for queue health
4. **User Preferences**: Allow users to configure notification preferences
5. **Template System**: Add notification templates for consistent messaging

## Conclusion

This queue-based system provides a robust, scalable solution for push notifications on Vercel's free tier. It handles failures gracefully, scales automatically, and maintains data consistency while being cost-effective and easy to monitor.
