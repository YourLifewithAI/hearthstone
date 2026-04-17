/**
 * Anthropic Messages API client — direct fetch, no SDK.
 *
 * Returns the raw Response so the caller can stream the body directly.
 * Cloudflare Workers support passing a ReadableStream through as-is.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  model?: string;
  max_tokens?: number;
}

const MODEL_ALIASES: Record<string, string> = {
  sonnet: 'claude-sonnet-4-5',
  haiku: 'claude-haiku-4-5',
  opus: 'claude-opus-4-5',
};

export function resolveModel(alias: string | undefined): string {
  if (!alias) return MODEL_ALIASES.sonnet;
  return MODEL_ALIASES[alias] ?? alias;
}

export async function streamAnthropicChat(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  options: StreamOptions = {}
): Promise<Response> {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? MODEL_ALIASES.sonnet,
      max_tokens: options.max_tokens ?? 4096,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });
}
