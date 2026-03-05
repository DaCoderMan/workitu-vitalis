import { MongoClient } from "mongodb";

const g = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };

function getClient(): Promise<MongoClient> {
  if (!g._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI");
    g._mongoClientPromise = new MongoClient(uri).connect();
  }
  return g._mongoClientPromise;
}

// Export as a getter - only connects when awaited at runtime
const clientPromise = {
  then<T1 = MongoClient, T2 = never>(
    resolve?: ((v: MongoClient) => T1 | PromiseLike<T1>) | null,
    reject?: ((e: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return getClient().then(resolve, reject);
  },
} as Promise<MongoClient>;

export default clientPromise;
