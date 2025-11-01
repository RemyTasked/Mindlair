import { AIProvider, AICompletionRequest, AICompletionResponse } from './aiProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { logger } from '../../utils/logger';

/**
 * AI Service Manager
 * Handles multiple AI providers with automatic fallback
 */
export class AIService {
  private providers: AIProvider[] = [];

  constructor() {
    // Initialize providers in priority order
    this.providers.push(new OpenAIProvider());
    this.providers.push(new GeminiProvider());

    // Log configured providers
    const configured = this.providers.filter(p => p.isConfigured());
    logger.info('AI Service initialized', {
      totalProviders: this.providers.length,
      configuredProviders: configured.map(p => p.name),
    });

    if (configured.length === 0) {
      logger.warn('No AI providers configured - AI features will not work');
    }
  }

  /**
   * Generate completion with automatic fallback
   * Tries each provider in order until one succeeds
   */
  async generateCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const configuredProviders = this.providers.filter(p => p.isConfigured());

    if (configuredProviders.length === 0) {
      throw new Error('No AI providers configured');
    }

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of configuredProviders) {
      try {
        logger.info(`Attempting AI request with ${provider.name}`);
        const response = await provider.generateCompletion(request);
        
        logger.info(`AI request succeeded`, {
          provider: response.provider,
          model: response.model,
          contentLength: response.content.length,
        });

        return response;
      } catch (error: any) {
        lastError = error;
        logger.warn(`${provider.name} failed, trying next provider`, {
          error: error.message,
          remainingProviders: configuredProviders.length - configuredProviders.indexOf(provider) - 1,
        });
      }
    }

    // All providers failed
    logger.error('All AI providers failed', {
      providers: configuredProviders.map(p => p.name),
      lastError: lastError?.message,
    });

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    return this.providers
      .filter(p => p.isConfigured())
      .map(p => p.name);
  }

  /**
   * Check if at least one provider is configured
   */
  isAvailable(): boolean {
    return this.providers.some(p => p.isConfigured());
  }
}

// Singleton instance
export const aiService = new AIService();

