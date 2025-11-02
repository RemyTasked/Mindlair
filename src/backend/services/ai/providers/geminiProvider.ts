import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AICompletionRequest, AICompletionResponse, AIMessage } from '../aiProvider';
import { logger } from '../../../utils/logger';

export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  private apiKey: string | undefined;
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (this.apiKey) {
      try {
        this.client = new GoogleGenerativeAI(this.apiKey);
        logger.info('Gemini provider initialized successfully', {
          keyPrefix: this.apiKey.substring(0, 8),
          keyLength: this.apiKey.length,
        });
      } catch (error: any) {
        logger.error('Failed to initialize Gemini client', {
          error: error.message,
        });
        this.client = null;
      }
    } else {
      logger.warn('GOOGLE_GEMINI_API_KEY not found in environment');
    }
  }

  isConfigured(): boolean {
    const configured = !!this.apiKey && !!this.client;
    if (!configured) {
      logger.debug('Gemini isConfigured check', {
        hasApiKey: !!this.apiKey,
        hasClient: !!this.client,
      });
    }
    return configured;
  }

  async generateCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Use gemini-1.5-flash for faster, cost-effective responses
      // or gemini-1.5-pro for higher quality
      const modelName = request.model || 'gemini-1.5-flash';
      const model = this.client.getGenerativeModel({ model: modelName });

      logger.info('Gemini request', {
        model: modelName,
        messageCount: request.messages.length,
        temperature: request.temperature,
      });

      // Convert messages to Gemini format
      const prompt = this.convertMessagesToPrompt(request.messages);

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 500,
        },
      });

      const response = await result.response;
      const content = response.text();

      logger.info('Gemini response received', {
        model: modelName,
        contentLength: content.length,
      });

      return {
        content,
        provider: this.name,
        model: modelName,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
      };
    } catch (error: any) {
      logger.error('Gemini request failed', {
        error: error.message,
      });
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Convert OpenAI-style messages to a single prompt for Gemini
   */
  private convertMessagesToPrompt(messages: AIMessage[]): string {
    let prompt = '';

    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System Instructions: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `${message.content}\n`;
      } else if (message.role === 'assistant') {
        // For multi-turn conversations (not currently used in Meet Cute)
        prompt += `Assistant: ${message.content}\n`;
      }
    }

    return prompt.trim();
  }
}

