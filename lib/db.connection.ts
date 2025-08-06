import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

// Augment the global NodeJS scope to cache the connection
// This prevents "Type 'Mongoose | Promise<Mongoose> | null' is not assignable to type 'Mongoose'" errors
declare global {
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

// Cache the connection on the global object to persist across serverless function invocations.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    console.log("=> using existing database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Recommended for modern Mongoose
    };
    console.log("=> creating new database connection");
    cached.promise = mongoose.connect(MONGODB_URI!, opts);
  }

  try {
    cached.conn = await cached.promise;

    // Ensure the connection is ready
    if (cached.conn.connection.readyState !== 1) {
      console.log("=> waiting for database connection to be ready");
      await new Promise((resolve) => {
        cached.conn!.connection.once("connected", resolve);
      });
    }

    console.log("✅ Successfully connected to MongoDB");
  } catch (e) {
    cached.promise = null; // Reset promise on error
    console.error("Error connecting to MongoDb", e);
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
