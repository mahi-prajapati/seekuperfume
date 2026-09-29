import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4100),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/seekuperfumes?replicaSet=rs0"),
  JWT_SECRET: z.string().min(32).default("development-only-jwt-secret-change-before-prod"),
  COOKIE_SECRET: z.string().min(32).default("development-only-cookie-secret-change-before-prod"),
  STOREFRONT_ORIGIN: z.string().url().default("http://127.0.0.1:8000"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export const env = schema.parse(process.env);

