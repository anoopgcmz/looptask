import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

const {
  MONGODB_MAX_POOL_SIZE = '10',
  MONGODB_MIN_POOL_SIZE = '1',
  MONGODB_SOCKET_TIMEOUT_MS = '45000',
} = process.env;

const maxPoolSize = parseInt(MONGODB_MAX_POOL_SIZE, 10);
const minPoolSize = parseInt(MONGODB_MIN_POOL_SIZE, 10);
const socketTimeoutMS = parseInt(MONGODB_SOCKET_TIMEOUT_MS, 10);

const DB_DEBUG = Boolean(process.env.DB_DEBUG);

function debugLog(...args: unknown[]) {
  if (DB_DEBUG) {
    console.debug('[DB_DEBUG]', ...args);
  }
}

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

async function connectWithRetry(
  retries = 5,
  delay = 500,
): Promise<typeof mongoose> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      debugLog(`Attempt ${attempt + 1} to connect`);
      const connection = await mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize,
        minPoolSize,
        socketTimeoutMS,
      });
      console.log('MongoDB connection established');
      return connection;
    } catch (error) {
      console.warn(`MongoDB connection attempt ${attempt + 1} failed`);
      debugLog(error);
      if (attempt === retries - 1) {
        console.error(`MongoDB connection failed after ${retries} attempts`);
        throw error;
      }
      const waitTime = delay * 2 ** attempt;
      console.log(`Retrying MongoDB connection in ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Failed to connect to MongoDB');
}

export default async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = connectWithRetry();
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
