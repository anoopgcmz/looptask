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

export default async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize,
      minPoolSize,
      socketTimeoutMS,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
