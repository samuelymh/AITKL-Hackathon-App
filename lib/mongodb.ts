import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// In development, use a global variable to preserve the connection across hot reloads
// In production, this ensures we don't create multiple connections
declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

cached ??= global.mongooseCache = { conn: null, promise: null };

/**
 * Optimized MongoDB connection for Vercel serverless functions
 * Uses connection pooling and caching to minimize connection overhead
 */
async function connectToDatabase(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached!.conn) {
    console.log("Using existing MongoDB connection");
    return cached!.conn;
  }

  // Return existing promise if connection is in progress
  if (!cached!.promise) {
    console.log("Creating new MongoDB connection...");

    const opts = {
      // Connection pool settings optimized for serverless
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

      // Disable buffering for serverless
      bufferCommands: false,

      // Connection optimization
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,

      // Database name from environment or default
      dbName: process.env.MONGODB_DB_NAME || "healthapp",
    };

    cached!.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance: typeof mongoose) => {
        console.log("✅ Successfully connected to MongoDB");
        return mongooseInstance;
      })
      .catch((error: Error) => {
        console.error("❌ MongoDB connection error:", error);
        // Reset the promise on error so we can retry
        cached!.promise = null;
        throw error;
      });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

/**
 * Get the current connection status
 */
export function getConnectionStatus(): string {
  const state = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };
  return states[state as keyof typeof states] || "unknown";
}

/**
 * Check if the database is connected
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Gracefully close the database connection
 * (Mainly for cleanup in non-serverless environments)
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (cached?.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log("📴 Disconnected from MongoDB");
  }
}

/**
 * Health check for the database connection
 */
export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  timestamp: Date;
  connectionState: string;
  details?: any;
}> {
  try {
    const mongooseInstance = await connectToDatabase();
    const db = mongooseInstance.connection.db;

    if (!db) {
      throw new Error("Database connection not available");
    }

    const adminDb = db.admin();
    const pingResult = await adminDb.ping();

    return {
      status: "healthy",
      timestamp: new Date(),
      connectionState: getConnectionStatus(),
      details: {
        ping: pingResult,
        host: mongooseInstance.connection.host,
        port: mongooseInstance.connection.port,
        dbName: mongooseInstance.connection.name,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      timestamp: new Date(),
      connectionState: getConnectionStatus(),
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

export default connectToDatabase;
