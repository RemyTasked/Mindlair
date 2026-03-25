import axios, { AxiosInstance } from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

class ApiClient {
  private client: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  setApiKey(key: string) {
    this.apiKey = key;
    this.client.defaults.headers.common["x-api-key"] = key;
  }

  clearApiKey() {
    this.apiKey = null;
    delete this.client.defaults.headers.common["x-api-key"];
  }

  async validateKey(): Promise<{ valid: boolean; userId?: string }> {
    try {
      const response = await this.client.get("/auth/validate");
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  }

  async ingestContent(data: {
    url?: string;
    text?: string;
    title?: string;
    surface: string;
    contentType?: string;
  }): Promise<{ success: boolean; sourceId?: string; claims?: any[] }> {
    const response = await this.client.post("/ingest", data);
    return response.data;
  }

  async getRecentSources(limit: number = 10): Promise<any[]> {
    const response = await this.client.get("/sources", {
      params: { limit },
    });
    return response.data.sources || [];
  }

  async getDigestStatus(): Promise<{
    pendingCount: number;
    lastDigestAt: string | null;
    nextDigestAt: string | null;
  }> {
    const response = await this.client.get("/digest/status");
    return response.data;
  }

  async getBeliefStats(): Promise<{
    totalBeliefs: number;
    strongBeliefs: number;
    tensions: number;
    concepts: number;
  }> {
    const response = await this.client.get("/stats/beliefs");
    return response.data;
  }

  async getNudges(limit: number = 5): Promise<any[]> {
    const response = await this.client.get("/nudges", {
      params: { limit },
    });
    return response.data.nudges || [];
  }

  async dismissNudge(nudgeId: string): Promise<void> {
    await this.client.post("/nudges/dismiss", { nudgeId });
  }
}

export const api = new ApiClient();
