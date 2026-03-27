import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";
import { config } from "./config.js";
import { JitoClient } from "./jitoClient.js";
import { error, info, warn } from "./logger.js";
import { PumpPortalClient } from "./pumpportalClient.js";
import { decodeVersionedTx, encodeVersionedTx, makeConnection, shortPk } from "./solana.js";
import { PumpTokenMetadata, TradeLocalRequest } from "./types.js";
import { LoadedWallet, loadWallets } from "./wallets.js";

type LaunchBundleInput = {
  metadata: PumpTokenMetadata;
  buyAmountSol?: number;
  buySlippageBps?: number;
  priorityFeeSol?: number;
};

type SellAllInput = {
  mint: string;
  sellSlippageBps?: number;
  priorityFeeSol?: number;
};

export class PumpfunBundlerBot {
  private readonly connection = makeConnection(config.SOLANA_RPC_URL);
  private readonly pumpPortal = new PumpPortalClient(config.PUMP_PORTAL_URL, config.PUMP_IPFS_URL);
  private readonly jito = new JitoClient(config.JITO_BLOCK_ENGINE_URL);
  private readonly creator: Keypair;
  private readonly bundleWallets: LoadedWallet[];

  constructor(creator: Keypair) {
    this.creator = creator;
    this.bundleWallets = loadWallets(config.bundleWallets);
  }

  async launchAndBundleBuy(input: LaunchBundleInput): Promise<{ mint: string; bundleId: string }> {
    const buyAmountSol = input.buyAmountSol ?? config.DEFAULT_BUY_SOL;
    const buySlippageBps = input.buySlippageBps ?? config.DEFAULT_BUY_SLIPPAGE_BPS;
    const priorityFeeSol = input.priorityFeeSol ?? config.DEFAULT_PRIORITY_FEE_SOL;

    info("Uploading token metadata to IPFS...");
    const uploaded = await this.pumpPortal.uploadMetadata(input.metadata);
    info("Metadata uploaded", uploaded);

    const mint = Keypair.generate();
    info(`Generated mint keypair ${shortPk(mint.publicKey)}`);

    const createRequest: TradeLocalRequest = {
      publicKey: this.creator.publicKey.toBase58(),
      action: "create",
      mint: mint.publicKey.toBase58(),
      denominatedInSol: "true",
      amount: buyAmountSol.toString(),
      slippage: buySlippageBps,
      priorityFee: priorityFeeSol,
      pool: config.DEFAULT_POOL,
      tokenMetadata: {
        name: input.metadata.name,
        symbol: input.metadata.symbol,
        description: input.metadata.description,
        twitter: input.metadata.twitter,
        telegram: input.metadata.telegram,
        website: input.metadata.website,
        file: uploaded.metadataUri
      }
    };

    const createTxData = await this.pumpPortal.buildTradeTx(createRequest);
    const createTx = decodeVersionedTx(createTxData.serializedTxBase64);
    createTx.sign([this.creator, mint]);

    const bundleSignedTxs: string[] = [encodeVersionedTx(createTx)];

    for (const wallet of this.bundleWallets) {
      const buyRequest: TradeLocalRequest = {
        publicKey: wallet.keypair.publicKey.toBase58(),
        action: "buy",
        mint: mint.publicKey.toBase58(),
        denominatedInSol: "true",
        amount: buyAmountSol.toString(),
        slippage: buySlippageBps,
        priorityFee: priorityFeeSol,
        pool: config.DEFAULT_POOL
      };

      const buyTxData = await this.pumpPortal.buildTradeTx(buyRequest);
      const buyTx = decodeVersionedTx(buyTxData.serializedTxBase64);
      buyTx.sign([wallet.keypair]);
      bundleSignedTxs.push(encodeVersionedTx(buyTx));

      info(`Prepared buy tx for ${wallet.label} (${shortPk(wallet.keypair.publicKey)})`);
    }

    const tipTx = await this.buildJitoTipTx(this.creator, config.JITO_TIP_LAMPORTS);
    bundleSignedTxs.push(encodeVersionedTx(tipTx));
    info(`Added Jito tip tx (${config.JITO_TIP_LAMPORTS} lamports)`);

    const bundleId = await this.jito.sendBundle(bundleSignedTxs);
    info(`Bundle submitted with ${bundleSignedTxs.length} txs`, { bundleId });

    return { mint: mint.publicKey.toBase58(), bundleId };
  }

  async sellAllFromBundleWallets(input: SellAllInput): Promise<string> {
    const sellSlippageBps = input.sellSlippageBps ?? config.DEFAULT_SELL_SLIPPAGE_BPS;
    const priorityFeeSol = input.priorityFeeSol ?? config.DEFAULT_PRIORITY_FEE_SOL;

    const bundleSignedTxs: string[] = [];
    for (const wallet of this.bundleWallets) {
      const sellRequest: TradeLocalRequest = {
        publicKey: wallet.keypair.publicKey.toBase58(),
        action: "sell",
        mint: input.mint,
        denominatedInSol: "false",
        amount: "100%",
        slippage: sellSlippageBps,
        priorityFee: priorityFeeSol,
        pool: config.DEFAULT_POOL
      };

      try {
        const sellTxData = await this.pumpPortal.buildTradeTx(sellRequest);
        const sellTx = decodeVersionedTx(sellTxData.serializedTxBase64);
        sellTx.sign([wallet.keypair]);
        bundleSignedTxs.push(encodeVersionedTx(sellTx));
        info(`Prepared sell tx for ${wallet.label} (${shortPk(wallet.keypair.publicKey)})`);
      } catch (sellError) {
        warn(`Skipping wallet ${wallet.label}; failed to build sell tx`, sellError);
      }
    }

    if (bundleSignedTxs.length === 0) {
      throw new Error("No sell transactions were prepared for bundle wallets");
    }

    const tipTx = await this.buildJitoTipTx(this.creator, config.JITO_TIP_LAMPORTS);
    bundleSignedTxs.push(encodeVersionedTx(tipTx));

    const bundleId = await this.jito.sendBundle(bundleSignedTxs);
    info(`Sell bundle submitted with ${bundleSignedTxs.length} txs`, { bundleId });
    return bundleId;
  }

  private async buildJitoTipTx(payer: Keypair, lamports: number): Promise<VersionedTransaction> {
    const tipReceiver = await this.fetchRandomTipAccount();
    const recentBlockhash = await this.connection.getLatestBlockhash("confirmed");

    const ix = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: tipReceiver,
      lamports
    });

    const msg = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [ix]
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg);
    tx.sign([payer]);
    return tx;
  }

  private async fetchRandomTipAccount(): Promise<PublicKey> {
    const endpoint = `${config.JITO_BLOCK_ENGINE_URL.replace(/\/$/, "")}/api/v1/getTipAccounts`;
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "getTipAccounts",
      params: []
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      error(`Failed to get tip accounts: ${response.status} ${response.statusText}`);
      throw new Error("Cannot fetch Jito tip accounts");
    }

    const json = (await response.json()) as { result?: string[] };
    if (!json.result || json.result.length === 0) {
      throw new Error("Jito did not return tip accounts");
    }
    return new PublicKey(json.result[0]);
  }
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}
