/**
 * LLM Router
 *
 * Routes LLM requests to providers with fallback support.
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  ProviderName,
  RouterConfig,
  RouterStatus
} from "./types.js";
import { LLMProviderError } from "./types.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createAnthropicProvider } from "./providers/anthropic.js";

export interface LLMRouter {
  complete(request: LLMRequest): Promise<LLMResponse>;
  getStatus(): RouterStatus;
}

function createProvider(name: ProviderName, config: RouterConfig): LLMProvider | undefined {
  const providerConfig = config.providers[name];
  if (!providerConfig) {
    return undefined;
  }

  switch (name) {
    case "openai":
      return createOpenAIProvider(providerConfig);
    case "anthropic":
      return createAnthropicProvider(providerConfig);
    default:
      return undefined;
  }
}

export function createLLMRouter(config: RouterConfig): LLMRouter {
  const providers = new Map<ProviderName, LLMProvider>();
  let lastError: string | undefined;

  // Initialize providers
  const primaryProvider = createProvider(config.primary, config);
  if (primaryProvider) {
    providers.set(config.primary, primaryProvider);
  }

  if (config.fallback && config.fallback !== config.primary) {
    const fallbackProvider = createProvider(config.fallback, config);
    if (fallbackProvider) {
      providers.set(config.fallback, fallbackProvider);
    }
  }

  async function tryProvider(
    provider: LLMProvider,
    request: LLMRequest
  ): Promise<LLMResponse> {
    if (!provider.isAvailable()) {
      throw new LLMProviderError(
        `Provider ${provider.name} is not available`,
        provider.name,
        undefined,
        false
      );
    }
    return provider.complete(request);
  }

  return {
    async complete(request: LLMRequest): Promise<LLMResponse> {
      const primary = providers.get(config.primary);

      // Try primary provider first
      if (primary && primary.isAvailable()) {
        try {
          const response = await tryProvider(primary, request);
          lastError = undefined;
          return response;
        } catch (error) {
          const providerError = error instanceof LLMProviderError
            ? error
            : new LLMProviderError(
                error instanceof Error ? error.message : String(error),
                config.primary,
                undefined,
                true
              );

          lastError = `Primary (${config.primary}): ${providerError.message}`;

          // Only try fallback if error is retryable or provider-specific
          if (!config.fallback) {
            throw providerError;
          }
        }
      }

      // Try fallback provider
      if (config.fallback) {
        const fallback = providers.get(config.fallback);
        if (fallback && fallback.isAvailable()) {
          try {
            const response = await tryProvider(fallback, request);
            // Keep lastError to indicate primary failed but fallback succeeded
            return response;
          } catch (error) {
            const fallbackError = error instanceof LLMProviderError
              ? error
              : new LLMProviderError(
                  error instanceof Error ? error.message : String(error),
                  config.fallback,
                  undefined,
                  false
                );

            lastError = `Both providers failed. Primary (${config.primary}): ${lastError || "unavailable"}. Fallback (${config.fallback}): ${fallbackError.message}`;
            throw new LLMProviderError(
              lastError,
              config.fallback,
              fallbackError.statusCode,
              false,
              fallbackError.cause
            );
          }
        }
      }

      // No providers available
      const availableProviders = Array.from(providers.entries())
        .filter(([_, p]) => p.isAvailable())
        .map(([name]) => name);

      if (availableProviders.length === 0) {
        throw new LLMProviderError(
          "No LLM providers available. Configure OPENAI_API_KEY or ANTHROPIC_API_KEY.",
          config.primary,
          undefined,
          false
        );
      }

      throw new LLMProviderError(
        `Primary provider ${config.primary} not available`,
        config.primary,
        undefined,
        false
      );
    },

    getStatus(): RouterStatus {
      const availableProviders = Array.from(providers.entries())
        .filter(([_, p]) => p.isAvailable())
        .map(([name]) => name);

      return {
        primary: config.primary,
        fallback: config.fallback,
        availableProviders,
        lastError
      };
    }
  };
}

/**
 * Create a router from environment variables
 */
export function createRouterFromEnv(options?: {
  primaryProvider?: ProviderName;
  fallbackProvider?: ProviderName;
  openaiModel?: string;
  anthropicModel?: string;
  maxTokens?: number;
}): LLMRouter {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Determine primary provider
  let primary: ProviderName = options?.primaryProvider || "openai";
  if (!openaiKey && anthropicKey && !options?.primaryProvider) {
    primary = "anthropic";
  }

  // Determine fallback provider
  let fallback: ProviderName | undefined = options?.fallbackProvider;
  if (!fallback && primary === "openai" && anthropicKey) {
    fallback = "anthropic";
  } else if (!fallback && primary === "anthropic" && openaiKey) {
    fallback = "openai";
  }

  const config: RouterConfig = {
    primary,
    fallback,
    providers: {}
  };

  if (openaiKey) {
    config.providers.openai = {
      apiKey: openaiKey,
      model: options?.openaiModel,
      maxTokens: options?.maxTokens
    };
  }

  if (anthropicKey) {
    config.providers.anthropic = {
      apiKey: anthropicKey,
      model: options?.anthropicModel,
      maxTokens: options?.maxTokens
    };
  }

  return createLLMRouter(config);
}
