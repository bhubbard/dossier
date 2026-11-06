import "server-only";

import { AiProvider } from "@/generated/prisma/enums";
import { getCloudflareEnv } from "@/lib/cloudflare/context";
import type { UsageSink } from "@/lib/usage";

import { AiError, toAiError } from "../errors";
import {
  BaseProvider,
  withJsonSchema,
  type ChatAnswer,
  type ChatCall,
} from "../provider";
import { OpenAICompatibleProvider } from "./openai-compatible";

export const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct";
export const POPULAR_WORKERS_AI_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  "@cf/qwen/qwen2.5-72b-instruct",
  "@cf/mistral/mistral-7b-instruct-v0.2",
];

export class WorkersAiProvider extends BaseProvider {
  readonly kind = AiProvider.WORKERS_AI;
  private readonly fallbackDelegate: OpenAICompatibleProvider | null = null;

  constructor(
    readonly baseUrl: string,
    readonly apiKey: string | null,
    model: string | null,
    timeoutMs: number,
    onUsage?: UsageSink,
  ) {
    super(model || DEFAULT_WORKERS_AI_MODEL, timeoutMs, onUsage);

    if (apiKey) {
      this.fallbackDelegate = new OpenAICompatibleProvider(
        "OPENAI",
        baseUrl || "https://api.cloudflare.com/client/v4/ai/v1",
        apiKey,
        this.model,
        timeoutMs,
        onUsage,
      );
    }
  }

  protected async chat(call: ChatCall): Promise<ChatAnswer> {
    const cf = await getCloudflareEnv();

    // 1. Native Cloudflare Edge binding (zero latency, no API key needed)
    if (cf?.AI) {
      try {
        const messages = [
          { role: "system", content: call.system },
          ...call.messages,
        ];

        let promptMessages = messages;
        if (call.json) {
          promptMessages = [
            { role: "system", content: withJsonSchema(call.system, call.json.schema) },
            ...call.messages,
          ];
        }

        const response = (await cf.AI.run(call.model || DEFAULT_WORKERS_AI_MODEL, {
          messages: promptMessages,
          max_tokens: call.maxTokens,
          temperature: call.temperature ?? 0.6,
        })) as { response?: unknown } | null;

        const text = typeof response?.response === "string" ? response.response : JSON.stringify(response);

        // Estimate tokens
        const promptTokens = Math.ceil(call.system.length / 4) + call.messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
        const completionTokens = Math.ceil(text.length / 4);
        call.used({ input: promptTokens, output: completionTokens });

        return { text, cutOff: false };
      } catch (err: unknown) {
        throw toAiError(err, { model: call.model, cancelled: call.signal.aborted });
      }
    }

    // 2. Delegate to Cloudflare OpenAI-compatible endpoint
    if (this.fallbackDelegate) {
      // @ts-expect-error accessing protected chat
      return this.fallbackDelegate.chat(call);
    }

    throw AiError.config(
      "Cloudflare Workers AI requires either the AI binding (when deployed on Cloudflare Workers) or an API token with Cloudflare account AI endpoint in Settings.",
    );
  }

  protected async fetchModels(): Promise<string[]> {
    return POPULAR_WORKERS_AI_MODELS;
  }
}
