# MongoDB Connection Pooling for Vercel Deployment

This implementation provides optimized MongoDB connection pooling specifically designed for serverless environments like Vercel. It addresses the unique challenges of serverless functions while maintaining high performance and reliability.

## 🎯 Key Features

- **Connection Reuse**: Singleton pattern ensures connections are reused across function invocations
- **Automatic Retry Logic**: Built-in retry mechanism for transient connection issues
- **Error Handling**: Comprehensive error handling with detailed logging
- **Health Monitoring**: Database health check endpoints for monitoring
- **Type Safety**: Full TypeScript support with proper type definitions
- **Vercel Optimized**: Configured specifically for Vercel's serverless environment

## 📁 File Structure

```
lib/
├── mongodb.ts           # Core connection management
├── db-utils.ts         # Database utilities and retry logic
└── models/
    └── User.ts         # Example Mongoose model

app/api/
├── health/
│   └── route.ts        # Health check endpoint
└── users/
    └── route.ts        # Example API routes
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (or configure in Vercel dashboard):

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
MONGODB_DB_NAME=healthapp

# Optional - Connection Pool Settings
MONGODB_MAX_POOL_SIZE=10
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
```

### Vercel Deployment Settings

In your Vercel dashboard, add these environment variables:
- `MONGODB_URI`: Your MongoDB connection string
- `MONGODB_DB_NAME`: Your database name

## 🚀 Usage Examples

### Basic Database Operation

```typescript
import { executeDatabaseOperation } from '@/lib/db-utils';
import User from '@/lib/models/User';

export async function GET() {
  const result = await executeDatabaseOperation(async () => {
    const users = await User.find({}).limit(10);
    return users;
  }, 'Fetch Users');

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
```

### Health Check

```typescript
// Check database health
const health = await checkDatabaseHealth();
console.log('Database status:', health.status);
```

### Connection Status

```typescript
import { getConnectionStatus, isConnected } from '@/lib/mongodb';

console.log('Connection state:', getConnectionStatus());
console.log('Is connected:', isConnected());
```

## 🔍 Monitoring and Debugging

### Health Check Endpoint

Access `/api/health` to get detailed connection information:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-03T12:00:00.000Z",
  "connectionState": "connected",
  "service": "MongoDB",
  "details": {
    "ping": { "ok": 1 },
    "host": "cluster.mongodb.net",
    "port": 27017,
    "dbName": "healthapp"
  },
  "uptime": 123,
  "memory": {
    "used": 45,
    "total": 128
  }
}
```

### Connection Pool Metrics

The implementation includes detailed logging for connection events:

```
🔄 Starting Database Operation...
📊 MongoDB Connection Info: { status: 'connected', isConnected: true }
✅ Database Operation completed successfully in 45ms
```

## ⚡ Performance Optimizations

### 1. Connection Pooling Settings

```typescript
const opts = {
  maxPoolSize: 10,                    // Max 10 connections
  serverSelectionTimeoutMS: 5000,     // 5 second timeout
  socketTimeoutMS: 45000,             // 45 second socket timeout
  maxIdleTimeMS: 30000,              // Close idle connections after 30s
  bufferCommands: false,             // Disable buffering for serverless
  bufferMaxEntries: 0                // No buffer entries
};
```

### 2. Retry Logic

- **Exponential Backoff**: Increases delay between retries
- **Jitter**: Adds randomness to prevent thundering herd
- **Selective Retries**: Only retries connection-related errors

### 3. Memory Management

- **Global Caching**: Reuses connections across function invocations
- **Development vs Production**: Different strategies for different environments
- **Connection Cleanup**: Automatic cleanup of idle connections

## 🛡️ Error Handling

### Connection Errors

```typescript
try {
  const result = await executeDatabaseOperation(operation);
} catch (error) {
  if (error.name === 'MongoNetworkError') {
    // Handle network issues
  } else if (error.name === 'MongoServerSelectionError') {
    // Handle server selection issues
  }
}
```

### Automatic Recovery

- **Retry Logic**: Automatically retries failed operations
- **Connection Recreation**: Creates new connections if needed
- **Graceful Degradation**: Returns meaningful error messages

## 📊 Best Practices

### 1. Connection Pool Size

- **Small Apps**: 5 connections
- **Medium Apps**: 10 connections  
- **Large Apps**: 20 connections
- **Never exceed** your MongoDB Atlas connection limit

### 2. Timeout Configuration

```typescript
// Optimized for Vercel's 10-second function timeout
serverSelectionTimeoutMS: 5000,  // Quick server selection
socketTimeoutMS: 45000,          // Long socket timeout for operations
maxIdleTimeMS: 30000            // Clean up idle connections
```

### 3. Error Handling

- Always use `executeDatabaseOperation` wrapper
- Log errors for debugging
- Return user-friendly error messages
- Never expose sensitive connection details

### 4. Model Definition

```typescript
// Use conditional model creation to prevent re-compilation
const User = mongoose.models.User || mongoose.model('User', UserSchema);
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit connection strings
2. **Connection Limits**: Respect MongoDB Atlas limits
3. **Error Messages**: Don't expose sensitive database information
4. **Network Security**: Use MongoDB Atlas IP whitelist if needed

## 🐛 Troubleshooting

### Common Issues

1. **Connection Limit Exceeded**
   - Reduce `maxPoolSize`
   - Check MongoDB Atlas connection limit
   - Monitor concurrent function executions

2. **Timeout Errors**
   - Increase `serverSelectionTimeoutMS`
   - Check network connectivity
   - Verify MongoDB Atlas status

3. **Memory Issues**
   - Ensure connections are properly cached
   - Check for connection leaks
   - Monitor Vercel function memory usage

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug: Connection details', connectionInfo);
}
```

## 📈 Performance Metrics

Expected performance improvements with connection pooling:

- **Connection Time**: ~200-300ms → ~5-10ms
- **Memory Usage**: High → Low (shared pool)
- **Error Rate**: High during spikes → Minimal
- **MongoDB Connections**: 1 per request → Fixed pool size

## 🚀 Deployment to Vercel

1. **Push to GitHub**: Commit all changes
2. **Environment Variables**: Configure in Vercel dashboard
3. **Deploy**: Vercel automatically deploys on push
4. **Test**: Use `/api/health` to verify connection

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health
```

This implementation ensures your healthcare application can handle concurrent users efficiently while maintaining optimal performance in Vercel's serverless environment.
