import redis from '../lib/redis';
import getConfig from '../config';
import { ConversationState, type BotSessionData } from '@yonda/shared';

function sessionKey(phone: string): string {
  return `session:${phone}`;
}

function dedupKey(messageId: string): string {
  return `processed_msg:${messageId}`;
}

export async function getSession(phone: string): Promise<BotSessionData | null> {
  const raw = await redis.get(sessionKey(phone));
  if (!raw) return null;
  return JSON.parse(raw) as BotSessionData;
}

export async function saveSession(phone: string, session: BotSessionData): Promise<void> {
  const ttl = getConfig().SESSION_TTL_SECONDS;
  await redis.set(sessionKey(phone), JSON.stringify(session), 'EX', ttl);
}

export async function clearSession(phone: string): Promise<void> {
  await redis.del(sessionKey(phone));
}

export function newSession(): BotSessionData {
  return {
    state: ConversationState.NEW,
    context: {},
    lastActivityAt: new Date().toISOString(),
  };
}

export function idleSession(userId: string): BotSessionData {
  return {
    state: ConversationState.IDLE,
    userId,
    context: {},
    lastActivityAt: new Date().toISOString(),
  };
}

export async function markMessageProcessed(messageId: string): Promise<boolean> {
  // Returns true if message was already processed (duplicate)
  const result = await redis.set(dedupKey(messageId), '1', 'EX', 300, 'NX');
  return result === null; // null means key already existed
}
