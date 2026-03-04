import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../server/db';
import { commentReactions, postReactions } from '../server/db/schema';
import { resolveAuthenticatedUser } from '../server/_lib/auth-user';
import { handleCors } from '../server/_lib/cors';
import { setSecurityHeaders } from '../server/_lib/security';

// Схема для создания/обновления реакции
const reactionSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.string().uuid(),
  reaction: z.number().int().min(-1).max(1), // 1 = like, -1 = dislike, 0 = remove
});

/**
 * POST /api/reactions - Установить реакцию (лайк/дизлайк)
 *
 * Body: { targetType: 'post' | 'comment', targetId: string, reaction: 1 | -1 | 0 }
 *
 * Response: { success: boolean, likes: number, dislikes: number }
 */
const handler = async (req: VercelRequest, res: VercelResponse) => {
  const corsResult = handleCors(req, res);
  if (corsResult) return corsResult;
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверяем аутентификацию
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = reactionSchema.parse(req.body);

    if (data.targetType === 'post') {
      return await handlePostReaction(data.targetId, auth.userId, data.reaction, res);
    } else {
      return await handleCommentReaction(data.targetId, auth.userId, data.reaction, res);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.issues,
      });
    }
    console.error('Reaction API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Обработка реакции на пост
 */
const handlePostReaction = async (
  postId: string,
  userId: string,
  reaction: number,
  res: VercelResponse,
) => {
  if (reaction === 0) {
    // Удалить реакцию
    await db
      .delete(postReactions)
      .where(and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)));
  } else {
    // Добавить или обновить реакцию
    const existing = await db
      .select()
      .from(postReactions)
      .where(and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)));

    if (existing.length > 0) {
      // Обновить существующую
      await db
        .update(postReactions)
        .set({ reaction })
        .where(and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)));
    } else {
      // Создать новую
      await db.insert(postReactions).values({
        postId,
        userId,
        reaction,
      });
    }
  }

  // Получить статистику
  const stats = await db
    .select({
      likes: sql<number>`count(*) filter (where ${postReactions.reaction} = 1)::int`,
      dislikes: sql<number>`count(*) filter (where ${postReactions.reaction} = -1)::int`,
    })
    .from(postReactions)
    .where(eq(postReactions.postId, postId));

  return res.status(200).json({
    success: true,
    likes: stats[0]?.likes ?? 0,
    dislikes: stats[0]?.dislikes ?? 0,
  });
};

/**
 * Обработка реакции на комментарий
 */
const handleCommentReaction = async (
  commentId: string,
  userId: string,
  reaction: number,
  res: VercelResponse,
) => {
  if (reaction === 0) {
    // Удалить реакцию
    await db
      .delete(commentReactions)
      .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId)));
  } else {
    // Добавить или обновить реакцию
    const existing = await db
      .select()
      .from(commentReactions)
      .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId)));

    if (existing.length > 0) {
      // Обновить существующую
      await db
        .update(commentReactions)
        .set({ reaction })
        .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId)));
    } else {
      // Создать новую
      await db.insert(commentReactions).values({
        commentId,
        userId,
        reaction,
      });
    }
  }

  // Получить статистику
  const stats = await db
    .select({
      likes: sql<number>`count(*) filter (where ${commentReactions.reaction} = 1)::int`,
      dislikes: sql<number>`count(*) filter (where ${commentReactions.reaction} = -1)::int`,
    })
    .from(commentReactions)
    .where(eq(commentReactions.commentId, commentId));

  return res.status(200).json({
    success: true,
    likes: stats[0]?.likes ?? 0,
    dislikes: stats[0]?.dislikes ?? 0,
  });
};

export default handler;
