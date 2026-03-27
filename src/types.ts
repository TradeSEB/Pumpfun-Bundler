export type WalletRecord = {
  label: string;
  privateKeyBase58: string;
};

export type PumpTokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  filePath: string;
};

export type TradeLocalRequest = {
  publicKey: string;
  action: "create" | "buy" | "sell";
  mint?: string;
  denominatedInSol: "true" | "false";
  amount: string;
  slippage: number;
  priorityFee: number;
  pool?: "pump";
  tokenMetadata?: {
    name: string;
    symbol: string;
    description: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    file: string;
  };
};

export type BuildTradeResult = {
  serializedTxBase64: string;
};
