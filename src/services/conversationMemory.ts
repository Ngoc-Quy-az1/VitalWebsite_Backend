import axios from 'axios';
import { Logger } from 'winston';
import { AppDataSource } from '@/data-source';
import { SessionMemory } from '@/models/session-memory';
import { Message } from '@/models/message';

const trim = (value: string, maxLength: number): string => {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
};

export const getConversationMemoryFromDb = async (userId?: string, sessionId?: string): Promise<string> => {
  if (!userId || !sessionId) {
    return '';
  }
  try {
    const sessionMemoryRepo = AppDataSource.getRepository(SessionMemory);
    const sessionMemory = await sessionMemoryRepo.findOne({
      where: { session_id: sessionId, user_id: userId },
    });
    return sessionMemory ? sessionMemory.memory_summary || '' : '';
  } catch (err) {
    return '';
  }
};

export const clearConversationMemory = async (userId?: string, sessionId?: string): Promise<void> => {
  if (!userId || !sessionId) {
    return;
  }
  try {
    const sessionMemoryRepo = AppDataSource.getRepository(SessionMemory);
    await sessionMemoryRepo.delete({ session_id: sessionId, user_id: userId });
  } catch (err) {
    // Keep silent
  }
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

  try {
    const messageRepo = AppDataSource.getRepository(Message);
    const sessionMemoryRepo = AppDataSource.getRepository(SessionMemory);

    // Count user messages in this session
    const userMessageCount = await messageRepo.count({
      where: { session_id: sessionId, sender_type: 'USER' },
    });

    // Summarize on turns: 2, 7, 12, 17, ...
    const isSummarizeTurn = userMessageCount >= 2 && (userMessageCount - 2) % 5 === 0;
    if (!isSummarizeTurn) {
      return;
    }

    // Get current session memory record
    let sessionMemory = await sessionMemoryRepo.findOne({
      where: { session_id: sessionId, user_id: userId },
    });

    const previousSummary = sessionMemory ? sessionMemory.memory_summary || '' : '';

    // Get all session memory records for the user to pass as previous summaries
    const allSessionMemories = await sessionMemoryRepo.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });

    const otherSummaries = allSessionMemories
      .filter((sm) => sm.session_id !== sessionId)
      .map((sm) => sm.memory_summary || '')
      .filter(Boolean)
      .slice(0, 10);

    // Fetch messages in session created after last_message_id (or all messages if none exist yet)
    const queryBuilder = messageRepo.createQueryBuilder('message')
      .where('message.session_id = :sessionId', { sessionId })
      .orderBy('message.created_at', 'ASC');

    if (sessionMemory?.last_message_id) {
      const lastMessage = await messageRepo.findOne({ where: { id: sessionMemory.last_message_id } });
      if (lastMessage) {
        queryBuilder.andWhere('message.created_at > :lastCreatedAt', { lastCreatedAt: lastMessage.created_at });
      }
    }

    const newMessages = await queryBuilder.getMany();
    if (newMessages.length === 0) {
      return;
    }

    // Compile new questions and answers
    const compiledQuestions = newMessages
      .filter((m) => m.sender_type === 'USER')
      .map((m) => m.content)
      .filter(Boolean)
      .join('\n');

    const compiledAnswers = newMessages
      .filter((m) => m.sender_type === 'BOT')
      .map((m) => m.content)
      .filter(Boolean)
      .join('\n');

    const latestMessage = newMessages[newMessages.length - 1];

    try {
      const response = await axios.post(
        `${chatbotApiUrl}/memory/summarize`,
        {
          previous_summary: previousSummary,
          previous_summaries: otherSummaries,
          question: trim(compiledQuestions, 900),
          answer: trim(compiledAnswers, 1600),
        },
        { timeout: 45000 },
      );

      const summary = trim(response.data?.summary || '', 1600);
      if (summary) {
        if (!sessionMemory) {
          sessionMemory = sessionMemoryRepo.create({
            user_id: userId,
            session_id: sessionId,
            memory_summary: summary,
            last_message_id: latestMessage?.id || null,
          });
        } else {
          sessionMemory.memory_summary = summary;
          if (latestMessage) {
            sessionMemory.last_message_id = latestMessage.id;
          }
        }
        await sessionMemoryRepo.save(sessionMemory);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : err;
      logger.warn('Conversation memory summary failed: %o', message);
      const fallback = trim(
        `${previousSummary} Lượt gần nhất: người dùng hỏi "${trim(compiledQuestions, 240)}"; trợ lý trả lời "${trim(
          compiledAnswers,
          320,
        )}".`,
        1600,
      );
      if (fallback) {
        if (!sessionMemory) {
          sessionMemory = sessionMemoryRepo.create({
            user_id: userId,
            session_id: sessionId,
            memory_summary: fallback,
            last_message_id: latestMessage?.id || null,
          });
        } else {
          sessionMemory.memory_summary = fallback;
          if (latestMessage) {
            sessionMemory.last_message_id = latestMessage.id;
          }
        }
        await sessionMemoryRepo.save(sessionMemory);
      }
    }
  } catch (err) {
    logger.error('Error updating conversation memory: %o', err);
  }
};
