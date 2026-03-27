import bs58 from "bs58";
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";

export function keypairFromBase58(base58PrivateKey: string): Keypair {
  const secretKeyBytes = bs58.decode(base58PrivateKey);
  return Keypair.fromSecretKey(secretKeyBytes);
}

export function makeConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, {
    commitment: "confirmed"
  });
}

export function decodeVersionedTx(base64Tx: string): VersionedTransaction {
  return VersionedTransaction.deserialize(Buffer.from(base64Tx, "base64"));
}

export function encodeVersionedTx(tx: VersionedTransaction): string {
  return Buffer.from(tx.serialize()).toString("base64");
}

export function shortPk(pk: PublicKey): string {
  const s = pk.toBase58();
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}
