import dotenv from "dotenv";
import { z } from "zod";
import { WalletRecord } from "./types.js";

dotenv.config();

const envSchema = z.object({
  SOLANA_RPC_URL: z.string().url(),
  JITO_BLOCK_ENGINE_URL: z.string().url(),
  PUMP_PORTAL_URL: z.string().url().default("https://pumpportal.fun"),
  PUMP_IPFS_URL: z.string().url().default("https://pumpportal.fun/api/ipfs"),
  BOT_WALLET_PRIVATE_KEY: z.string().min(30),
  BUNDLE_WALLETS: z.string().min(3),
  JITO_TIP_LAMPORTS: z.coerce.number().int().nonnegative().default(10000),
  DEFAULT_BUY_SOL: z.coerce.number().positive().default(0.01),
  DEFAULT_BUY_SLIPPAGE_BPS: z.coerce.number().int().positive().default(1000),
  DEFAULT_SELL_SLIPPAGE_BPS: z.coerce.number().int().positive().default(1500),
  DEFAULT_PRIORITY_FEE_SOL: z.coerce.number().nonnegative().default(0.0005),
  DEFAULT_POOL: z.enum(["pump"]).default("pump")
});

type Env = z.infer<typeof envSchema>;

function parseBundleWallets(raw: string): WalletRecord[] {
  const parsed = JSON.parse(raw) as WalletRecord[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("BUNDLE_WALLETS must be a non-empty JSON array");
  }
  for (const item of parsed) {
    if (!item.label || !item.privateKeyBase58) {
      throw new Error("Each BUNDLE_WALLETS entry needs label and privateKeyBase58");
    }
  }
  return parsed;
}

const parsedEnv = envSchema.parse(process.env as Record<string, unknown>);

export const config: Env & { bundleWallets: WalletRecord[] } = {
  ...parsedEnv,
  bundleWallets: parseBundleWallets(parsedEnv.BUNDLE_WALLETS)
};
