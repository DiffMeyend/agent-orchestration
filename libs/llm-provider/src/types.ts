/**
 * LLM Provider Types
 *
 * Defines interfaces for multi-provider LLM routing.
 */

export type ProviderName = "openai" | "anthropic";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  provider: ProviderName;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  baseUrl?: string;
}

export interface LLMProvider {
  name: ProviderName;
  isAvailable(): boolean;
  complete(request: LLMRequest): Promise<LLMResponse>;
}

export interface RouterConfig {
  primary: ProviderName;
  fallback?: ProviderName;
  providers: Partial<Record<ProviderName, ProviderConfig>>;
}

export interface RouterStatus {
  primary: ProviderName;
  fallback?: ProviderName;
  availableProviders: ProviderName[];
  lastError?: string;
}

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderName,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}
