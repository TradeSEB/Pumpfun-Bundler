import { Keypair } from "@solana/web3.js";
import { WalletRecord } from "./types.js";
import { keypairFromBase58 } from "./solana.js";

export type LoadedWallet = {
  label: string;
  keypair: Keypair;
};

export function loadWallets(records: WalletRecord[]): LoadedWallet[] {
  return records.map((record) => ({
    label: record.label,
    keypair: keypairFromBase58(record.privateKeyBase58)
  }));
}
