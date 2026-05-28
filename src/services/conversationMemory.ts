import axios from 'axios';
import { Logger } from 'winston';

const memoryStore = new Map<string, string>();

const trim = (value: string, maxLength: number): string => {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
};

export const conversationMemoryKey = (userId: string, sessionId: string): string => {
  return `${userId}:${sessionId}`;
};

export const getConversationMemory = (userId?: string, sessionId?: string): string => {
  if (!userId || !sessionId) {
    return '';
  }
  return memoryStore.get(conversationMemoryKey(userId, sessionId)) || '';
};

export const clearConversationMemory = (userId?: string, sessionId?: string): void => {
  if (!userId || !sessionId) {
    return;
  }
  memoryStore.delete(conversationMemoryKey(userId, sessionId));
};

export const updateConversationMemory = async (
  chatbotApiUrl: string,
  userId: string,
  sessionId: string,
  question: string,
  answer: string,
  logger: Logger,
): Promise<void> => {
  if (!userId || !sessionId || !question || !answer) {
    return;
  }

  const key = conversationMemoryKey(userId, sessionId);
  const previousSummary = memoryStore.get(key) || '';

  try {
    const response = await axios.post(
      `${chatbotApiUrl}/memory/summarize`,
      {
        previous_summary: previousSummary,
        question: trim(question, 900),
        answer: trim(answer, 1600),
      },
      { timeout: 45000 },
    );
    const summary = trim(response.data?.summary || '', 1600);
    if (summary) {
      memoryStore.set(key, summary);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : err;
    logger.warn('Conversation memory summary failed: %o', message);
    const fallback = trim(
      `${previousSummary} Lượt gần nhất: người dùng hỏi "${trim(question, 240)}"; trợ lý trả lời "${trim(
        answer,
        320,
      )}".`,
      1600,
    );
    if (fallback) {
      memoryStore.set(key, fallback);
    }
  }
};
