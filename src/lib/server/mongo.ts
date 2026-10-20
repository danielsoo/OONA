import { MongoClient, type Db } from "mongodb";

/**
 * The server's MongoDB, from MONGODB_URI (and MONGODB_DB, "oona" by default),
 * or null when it isn't configured. One client per server process: kept on
 * globalThis so serverless warm starts and dev reloads reuse it.
 */

const globalMongo = globalThis as typeof globalThis & { __oonaMongo?: Promise<MongoClient> };

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return null;
  globalMongo.__oonaMongo ??= new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 })
    .connect()
    .catch((error: unknown) => {
      // Let the next request try again instead of keeping a failed client.
      globalMongo.__oonaMongo = undefined;
      throw error;
    });
  const client = await globalMongo.__oonaMongo;
  return client.db(process.env.MONGODB_DB?.trim() || "oona");
}
