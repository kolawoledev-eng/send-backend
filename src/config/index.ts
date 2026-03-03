import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(1).default("change-me-in-production"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  STELLAR_NETWORK: z.enum(["testnet", "public"]).default("public"),
  SOROBAN_RPC_URL: z.string().url().default("https://soroban-mainnet.stellar.org"),
  STELLAR_HORIZON_URL: z.string().url().default("https://horizon.stellar.org"),
  STELLAR_SERVER_SECRET_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default("*"),
  // SEP-24 / Anchor Platform (NGN → USDC on-ramp)
  ANCHOR_PLATFORM_SERVER: z.string().url().optional(),
  ANCHOR_HOME_DOMAIN: z.string().optional(),
  SECRET_SEP24_INTERACTIVE_JWT_SECRET: z.string().optional(),
  USDC_ISSUER: z.string().optional(),
});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten());
    process.exit(1);
  }
  return parsed.data;
}

export const config = loadConfig();
