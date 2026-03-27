import fs from "node:fs";
import path from "node:path";
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import { BuildTradeResult, PumpTokenMetadata, TradeLocalRequest } from "./types.js";

type UploadMetadataResult = {
  metadataUri: string;
  imageUri?: string;
};

export class PumpPortalClient {
  private readonly http: AxiosInstance;
  private readonly ipfsUrl: string;

  constructor(baseUrl: string, ipfsUrl: string) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30_000
    });
    this.ipfsUrl = ipfsUrl;
  }

  async uploadMetadata(meta: PumpTokenMetadata): Promise<UploadMetadataResult> {
    const form = new FormData();
    form.append("name", meta.name);
    form.append("symbol", meta.symbol);
    form.append("description", meta.description);
    form.append("twitter", meta.twitter ?? "");
    form.append("telegram", meta.telegram ?? "");
    form.append("website", meta.website ?? "");

    const imagePath = path.resolve(meta.filePath);
    form.append("file", fs.createReadStream(imagePath));

    const response = await axios.post<UploadMetadataResult>(this.ipfsUrl, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity
    });
    return response.data;
  }

  async buildTradeTx(request: TradeLocalRequest): Promise<BuildTradeResult> {
    const response = await this.http.post<ArrayBuffer>("/api/trade-local", request, {
      responseType: "arraybuffer",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const serializedTxBase64 = Buffer.from(response.data).toString("base64");
    return { serializedTxBase64 };
  }
}
