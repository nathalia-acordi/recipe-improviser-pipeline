import { MongoClient } from "mongodb";

let client;

export async function getDb() {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI não definida");

    client = new MongoClient(uri, {
      tls: true, 
      serverSelectionTimeoutMS: 5000, 
    });

    await client.connect();
  }

  return client.db("recipe-improviser");
}

export async function jobsCollection() {
  const db = await getDb();
  return db.collection("jobs");
}
