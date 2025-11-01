/**
 * AI Provider Abstraction Layer
 * Supports multiple AI providers with automatic fallback
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AICompletionResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
}

export interface AIProviderConfig {
  name: string;
  enabled: boolean;
  priority: number; // Lower number = higher priority
}

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  generateCompletion(request: AICompletionRequest): Promise<AICompletionResponse>;
}

