import { connectToDatabase } from "./db.connection";

export async function initDB() {
  try {
    const db = await connectToDatabase();
    console.log("Global database connection initialized");
    return db;
  } catch (error) {
    console.error("Failed to initialize global database connection", error);
    throw error;
  }
}
