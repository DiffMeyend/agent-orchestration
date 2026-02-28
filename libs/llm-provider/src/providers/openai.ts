/**
 * OpenAI Provider
 *
 * LLM provider implementation for OpenAI API.
 */

import https from "node:https";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  ProviderConfig
} from "../types.js";
import { LLMProviderError } from "../types.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 2048;
const CHAT_COMPLETIONS_PATH = "/v1/chat/completions";

export interface OpenAIConfig extends ProviderConfig {
  model?: string;
}

function extractMessageContent(payload: unknown): string {
  const p = payload as Record<string, unknown>;
  const choices = p?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }
  const message = (choices[0] as Record<string, unknown>)?.message;
  const content = (message as Record<string, unknown>)?.content;

  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return (part as { text?: string }).text ?? "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

function extractUsage(payload: unknown): { inputTokens: number; outputTokens: number } | undefined {
  const p = payload as Record<string, unknown>;
  const usage = p?.usage as Record<string, unknown> | undefined;
  if (!usage) return undefined;

  const promptTokens = usage.prompt_tokens;
  const completionTokens = usage.completion_tokens;

  if (typeof promptTokens === "number" && typeof completionTokens === "number") {
    return {
      inputTokens: promptTokens,
      outputTokens: completionTokens
    };
  }
  return undefined;
}

export function createOpenAIProvider(config: OpenAIConfig): LLMProvider {
  const apiKey = config.apiKey;
  const defaultModel = config.model || DEFAULT_MODEL;
  const defaultMaxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;

  return {
    name: "openai",

    isAvailable(): boolean {
      return Boolean(apiKey);
    },

    async complete(request: LLMRequest): Promise<LLMResponse> {
      if (!apiKey) {
        throw new LLMProviderError(
          "OpenAI API key not configured",
          "openai",
          undefined,
          false
        );
      }

      const model = request.model || defaultModel;
      const maxTokens = request.maxTokens || defaultMaxTokens;

      const body = JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? 0.7,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      });

      return new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname: "api.openai.com",
            path: CHAT_COMPLETIONS_PATH,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body).toString(),
              Authorization: `Bearer ${apiKey}`
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
                    `OpenAI API error (${res.statusCode}): ${data}`,
                    "openai",
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
                      "Empty response from OpenAI",
                      "openai",
                      undefined,
                      true
                    )
                  );
                  return;
                }
                resolve({
                  content,
                  provider: "openai",
                  model,
                  usage: extractUsage(parsed)
                });
              } catch (error) {
                reject(
                  new LLMProviderError(
                    error instanceof Error ? error.message : String(error),
                    "openai",
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
              "openai",
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
