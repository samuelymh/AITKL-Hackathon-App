import mongoose from "mongoose";

const dbUri = process.env.DB_URL;
let mongooseInstance: typeof mongoose | null = null;

export const connectToDatabase = async () => {
  try {
    if (!dbUri) {
      throw new Error(
        "Please define the MONGODB_URI environment variable inside .env.local"
      );
    }
    await mongoose.connect(dbUri);
    console.log("Conected to MongoDb");
    return mongooseInstance;
  } catch (error) {
    console.error("Error connecting to MongoDb", error);
    throw error;
  }
};

export default mongooseInstance;
