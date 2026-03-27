# Pumpfun Jito Bundler Bot

Solana TypeScript bot for:

- Launching a new token on Pump.fun
- Bundling multi-wallet buy transactions at launch
- Selling token from all bundle wallets in one bundled flow
- Sending bundles through Jito block engine

## Features

- `launch-and-bundle` command:
  - uploads metadata/image
  - creates token launch transaction
  - creates buy transactions for every bundle wallet
  - adds Jito tip transaction
  - submits all as one Jito bundle
- `sell-all` command:
  - builds sell `100%` tx per bundle wallet
  - adds Jito tip transaction
  - submits as Jito bundle
- Strong environment validation with `zod`
- Base58 private key wallet loading

## Stack

- Node.js + TypeScript
- `@solana/web3.js`
- PumpPortal local trade API (`/api/trade-local`, `/api/ipfs`)
- Jito JSON-RPC bundle endpoint (`sendBundle`)

## Project Structure

- `src/config.ts` env validation + typed config
- `src/pumpportalClient.ts` PumpPortal API client
- `src/jitoClient.ts` Jito bundle sender
- `src/bundleBot.ts` orchestration logic
- `src/index.ts` CLI entrypoint
- `metadata/sample-token.json` sample launch metadata

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Fill `.env`:
   - `BOT_WALLET_PRIVATE_KEY`: creator wallet base58 secret key
   - `BUNDLE_WALLETS`: JSON array of wallet labels + base58 keys
   - RPC + Jito endpoints

4. Put token image at path used in your metadata file (example: `./metadata/token.png`).

## Commands

### 1) Launch + bundle buys

```bash
npm run launch-and-bundle -- --metadata ./metadata/sample-token.json --buy-sol 0.02 --slippage-bps 1200 --priority-fee 0.0007
```

Parameters:

- `--metadata` path to JSON metadata file (required)
- `--buy-sol` buy size in SOL per wallet (optional)
- `--slippage-bps` slippage in bps (optional)
- `--priority-fee` priority fee in SOL (optional)

### 2) Sell from all bundle wallets

```bash
npm run sell-all -- --mint <MINT_ADDRESS> --slippage-bps 1800 --priority-fee 0.001
```

Parameters:

- `--mint` token mint address (required)
- `--slippage-bps` slippage in bps (optional)
- `--priority-fee` priority fee in SOL (optional)

## Metadata JSON Format

```json
{
  "name": "My Bundle Token",
  "symbol": "MBT",
  "description": "Token launched by bot",
  "twitter": "https://x.com/your_account",
  "telegram": "https://t.me/your_group",
  "website": "https://your-site.com",
  "imagePath": "./metadata/token.png"
}
```

## 📞 Support

- telegram: https://t.me/trade_SEB
- twitter:  https://x.com/TradeSEB_
