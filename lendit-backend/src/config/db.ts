import mongoose from "mongoose";
import { logger } from "../utils/logger";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error(
        "MONGODB_URI is not set. Copy .env.example to .env and fill it in.",
      );
    }
    await mongoose.connect(uri);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${(error)}`);
    process.exit(1);
  }
};
