import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, {
    appName: "seekuperfumes-commerce",
    maxPoolSize: 30,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    autoIndex: env.NODE_ENV !== "production",
  });
}

export async function databaseHealth() {
  const started = performance.now();
  await mongoose.connection.db?.admin().ping();
  return { status: "connected", latencyMs: Math.round(performance.now() - started) };
}

