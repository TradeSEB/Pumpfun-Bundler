import axios, { AxiosInstance } from "axios";

type JsonRpcResult<T> = {
  jsonrpc: string;
  id: string | number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

export class JitoClient {
  private readonly http: AxiosInstance;

  constructor(blockEngineUrl: string) {
    this.http = axios.create({
      baseURL: blockEngineUrl,
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async sendBundle(base64Transactions: string[]): Promise<string> {
    if (base64Transactions.length === 0) {
      throw new Error("sendBundle needs at least one transaction");
    }

    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [base64Transactions]
    };

    const response = await this.http.post<JsonRpcResult<string>>("/api/v1/bundles", payload);
    if (response.data.error) {
      throw new Error(`Jito sendBundle error ${response.data.error.code}: ${response.data.error.message}`);
    }
    if (!response.data.result) {
      throw new Error("Jito sendBundle returned no bundle id");
    }

    return response.data.result;
  }
}
