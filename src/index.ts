import fs from "node:fs";
import path from "node:path";
import { PumpfunBundlerBot } from "./bundleBot.js";
import { config } from "./config.js";
import { error, info } from "./logger.js";
import { keypairFromBase58 } from "./solana.js";
import { PumpTokenMetadata } from "./types.js";

type Args = Record<string, string | boolean | undefined>;

function parseArgs(argv: string[]): { command: string; args: Args } {
  const command = argv[2] ?? "";
  const args: Args = {};

  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }

  return { command, args };
}

function requiredString(args: Args, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required argument --${key}`);
  }
  return value;
}

function optionalNumber(args: Args, key: string): number | undefined {
  const value = args[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for --${key}: ${value}`);
  }
  return parsed;
}

function loadMetadataFromFile(filePath: string): PumpTokenMetadata {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Metadata json file not found: ${absolute}`);
  }

  const raw = fs.readFileSync(absolute, "utf-8");
  const parsed = JSON.parse(raw) as Omit<PumpTokenMetadata, "filePath"> & { imagePath: string };
  if (!parsed.name || !parsed.symbol || !parsed.description || !parsed.imagePath) {
    throw new Error("metadata file must include name, symbol, description and imagePath");
  }

  return {
    name: parsed.name,
    symbol: parsed.symbol,
    description: parsed.description,
    twitter: parsed.twitter,
    telegram: parsed.telegram,
    website: parsed.website,
    filePath: parsed.imagePath
  };
}

async function run(): Promise<void> {
  const { command, args } = parseArgs(process.argv);
  const creator = keypairFromBase58(config.BOT_WALLET_PRIVATE_KEY);
  const bot = new PumpfunBundlerBot(creator);

  if (command === "launch-and-bundle") {
    const metadataPath = requiredString(args, "metadata");
    const metadata = loadMetadataFromFile(metadataPath);
    const buyAmountSol = optionalNumber(args, "buy-sol");
    const slippageBps = optionalNumber(args, "slippage-bps");
    const priorityFeeSol = optionalNumber(args, "priority-fee");

    const result = await bot.launchAndBundleBuy({
      metadata,
      buyAmountSol,
      buySlippageBps: slippageBps,
      priorityFeeSol
    });
    info(`Launch + bundle buy done. Mint: ${result.mint} | bundleId: ${result.bundleId}`);
    return;
  }

  if (command === "sell-all") {
    const mint = requiredString(args, "mint");
    const slippageBps = optionalNumber(args, "slippage-bps");
    const priorityFeeSol = optionalNumber(args, "priority-fee");
    const bundleId = await bot.sellAllFromBundleWallets({
      mint,
      sellSlippageBps: slippageBps,
      priorityFeeSol
    });
    info(`Sell-all bundle sent. bundleId: ${bundleId}`);
    return;
  }

  console.log("Usage:");
  console.log("  npm run launch-and-bundle -- --metadata ./metadata/token.json [--buy-sol 0.02]");
  console.log("  npm run sell-all -- --mint <MINT_ADDRESS>");
}

run().catch((e) => {
  error("Bot execution failed", e);
  process.exit(1);
});
