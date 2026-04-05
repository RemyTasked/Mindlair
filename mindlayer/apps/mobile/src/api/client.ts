import axios, { AxiosInstance } from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export interface Post {
  id: string;
  headlineClaim: string;
  body: string;
  authorStance: "arguing" | "exploring" | "steelmanning";
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  topicTags: string[];
  author?: {
    id: string;
    name: string | null;
  };
  userReaction?: string | null;
}

export interface FeedResponse {
  posts: Post[];
  nextCursor: string | undefined;
  hasMore: boolean;
}

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

  async getFeed(params: {
    cursor?: string;
    filter?: string;
    limit?: number;
  }): Promise<FeedResponse> {
    const response = await this.client.get("/feed", { params });
    return {
      posts: response.data.posts || [],
      nextCursor: response.data.nextCursor,
      hasMore: response.data.hasMore ?? false,
    };
  }

  async createPost(data: {
    headlineClaim: string;
    postBody: string;
    authorStance: string;
  }): Promise<{ post: Post }> {
    const response = await this.client.post("/posts", data);
    return response.data;
  }

  async updatePost(postId: string, data: {
    headlineClaim?: string;
    postBody?: string;
    authorStance?: string;
  }): Promise<{ post: Post }> {
    const response = await this.client.patch(`/posts/${postId}`, data);
    return response.data;
  }

  async publishPost(postId: string): Promise<{ success: boolean }> {
    const response = await this.client.post(`/posts/${postId}/publish`);
    return response.data;
  }

  async reactToPost(postId: string, reaction: string): Promise<void> {
    await this.client.post(`/posts/${postId}/react`, { reaction });
  }

  async getPost(postId: string): Promise<Post> {
    const response = await this.client.get(`/posts/${postId}`);
    return response.data.post;
  }
}

export const api = new ApiClient();
