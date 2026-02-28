/**
 * Anthropic Provider
 *
 * LLM provider implementation for Anthropic Claude API.
 */

import https from "node:https";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  LLMMessage
} from "../types.js";
import { LLMProviderError } from "../types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 2048;
const MESSAGES_PATH = "/v1/messages";
const API_VERSION = "2023-06-01";

export interface AnthropicConfig extends ProviderConfig {
  model?: string;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

function extractMessageContent(payload: unknown): string {
  const p = payload as Record<string, unknown>;
  const content = p?.content;

  if (!Array.isArray(content) || content.length === 0) {
    return "";
  }

  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (block && typeof block === "object" && "type" in block) {
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") {
          return b.text;
        }
      }
      return "";
    })
    .join("");
}

function extractUsage(payload: unknown): { inputTokens: number; outputTokens: number } | undefined {
  const p = payload as Record<string, unknown>;
  const usage = p?.usage as Record<string, unknown> | undefined;
  if (!usage) return undefined;

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;

  if (typeof inputTokens === "number" && typeof outputTokens === "number") {
    return { inputTokens, outputTokens };
  }
  return undefined;
}

function convertMessages(messages: LLMMessage[]): { system?: string; messages: AnthropicMessage[] } {
  let systemPrompt: string | undefined;
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt = msg.content;
    } else {
      anthropicMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content
      });
    }
  }

  return { system: systemPrompt, messages: anthropicMessages };
}

export function createAnthropicProvider(config: AnthropicConfig): LLMProvider {
  const apiKey = config.apiKey;
  const defaultModel = config.model || DEFAULT_MODEL;
  const defaultMaxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;

  return {
    name: "anthropic",

    isAvailable(): boolean {
      return Boolean(apiKey);
    },

    async complete(request: LLMRequest): Promise<LLMResponse> {
      if (!apiKey) {
        throw new LLMProviderError(
          "Anthropic API key not configured",
          "anthropic",
          undefined,
          false
        );
      }

      const model = request.model || defaultModel;
      const maxTokens = request.maxTokens || defaultMaxTokens;
      const { system, messages } = convertMessages(request.messages);

      const requestBody: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages
      };

      if (system) {
        requestBody.system = system;
      }

      const body = JSON.stringify(requestBody);

      return new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname: "api.anthropic.com",
            path: MESSAGES_PATH,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body).toString(),
              "x-api-key": apiKey,
              "anthropic-version": API_VERSION
            }
          },
          (res) => {
            let data = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                const retryable = res.statusCode === 429 || res.statusCode >= 500;
                reject(
                  new LLMProviderError(
                    `Anthropic API error (${res.statusCode}): ${data}`,
                    "anthropic",
                    res.statusCode,
                    retryable
                  )
                );
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = extractMessageContent(parsed);
                if (!content) {
                  reject(
                    new LLMProviderError(
                      "Empty response from Anthropic",
                      "anthropic",
                      undefined,
                      true
                    )
                  );
                  return;
                }
                resolve({
                  content,
                  provider: "anthropic",
                  model,
                  usage: extractUsage(parsed)
                });
              } catch (error) {
                reject(
                  new LLMProviderError(
                    error instanceof Error ? error.message : String(error),
                    "anthropic",
                    undefined,
                    true,
                    error instanceof Error ? error : undefined
                  )
                );
              }
            });
          }
        );

        req.on("error", (error) => {
          reject(
            new LLMProviderError(
              error.message,
              "anthropic",
              undefined,
              true,
              error
            )
          );
        });

        req.write(body);
        req.end();
      });
    }
  };
}
