/**
 * IndexedDB via Dexie.js — offline cache + message queue.
 */

import Dexie, { type Table } from 'dexie';
import type { ConversationSummary, ConversationMessage } from './types';

export interface StoredMessage extends ConversationMessage {
  id?: number;
  conversation_id: string;
}

export interface QueuedMessage {
  id?: number;
  conversation_id: string;
  content: string;
  queued_at: string;
}

export interface StateCacheEntry {
  key: string;
  data: string;
  cached_at: string;
}

class HearthstoneDB extends Dexie {
  conversations!: Table<ConversationSummary, string>;
  messages!: Table<StoredMessage, number>;
  queue!: Table<QueuedMessage, number>;
  stateCache!: Table<StateCacheEntry, string>;

  constructor() {
    super('hearthstone');
    this.version(1).stores({
      conversations: 'id, updated_at',
      messages: '++id, conversation_id, timestamp',
      queue: '++id, conversation_id, queued_at',
      stateCache: 'key',
    });
  }
}

export const db = new HearthstoneDB();

export async function cacheState(key: string, data: unknown): Promise<void> {
  await db.stateCache.put({
    key,
    data: JSON.stringify(data),
    cached_at: new Date().toISOString(),
  });
}

export async function readCachedState<T>(key: string): Promise<T | null> {
  const row = await db.stateCache.get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.data) as T;
  } catch {
    return null;
  }
}
