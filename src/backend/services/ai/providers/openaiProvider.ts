import axios from 'axios';
import { AIProvider, AICompletionRequest, AICompletionResponse } from '../aiProvider';
import { logger } from '../../../utils/logger';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }

  async generateCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const model = request.model || 'gpt-4';
      
      logger.info('OpenAI request', {
        model,
        messageCount: request.messages.length,
        temperature: request.temperature,
      });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage?.total_tokens;

      logger.info('OpenAI response received', {
        model: response.data.model,
        tokensUsed,
        contentLength: content.length,
      });

      return {
        content,
        provider: this.name,
        model: response.data.model,
        tokensUsed,
        finishReason: response.data.choices[0].finish_reason,
      };
    } catch (error: any) {
      logger.error('OpenAI request failed', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

