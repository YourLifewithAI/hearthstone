/**
 * System prompt assembly from KV context chunks.
 *
 * Reads every CTX_KEY and concatenates them into one system prompt.
 * Customize CTX_TITLES (in types.ts) to change section headings.
 */

import { CTX_KEYS, CTX_TITLES } from '../types';
import { getContextChunk } from './kv';

const HEADER = `You are this user's personal Claude assistant, accessible from their phone via Hearthstone. They've shared context about themselves below — read it and be useful. Don't announce that you have context; just use it. Be direct, match their tone, and skip preamble.`;

export async function buildSystemPrompt(kv: KVNamespace): Promise<string> {
  const chunks = await Promise.all(
    CTX_KEYS.map(async (key) => [key, await getContextChunk(kv, key)] as const)
  );

  const parts: string[] = [HEADER];

  for (const [key, content] of chunks) {
    if (!content) continue;
    parts.push(`\n\n## ${CTX_TITLES[key]}\n\n${content.trim()}`);
  }

  return parts.join('');
}
