import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { comments, users } from '../db/schema';
import { resolveAuthenticatedUser } from '../_lib/auth-user';
import { handleCors } from '../_lib/cors';

// Схема для обновления комментария
const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

/**
 * PUT /api/comments/[id] - Обновление комментария
 * DELETE /api/comments/[id] - Удаление комментария
 */
const handler = async (req: VercelRequest, res: VercelResponse) => {
  const corsResult = handleCors(req, res);
  if (corsResult) return corsResult;

  const commentId = req.query['id'] as string;

  if (!commentId) {
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  try {
    if (req.method === 'PUT') {
      return await handleUpdateComment(req, commentId, res);
    }

    if (req.method === 'DELETE') {
      return await handleDeleteComment(req, commentId, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Comment API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Обновление комментария
 */
const handleUpdateComment = async (req: VercelRequest, commentId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = updateCommentSchema.parse(req.body);

    // Получаем комментарий и проверяем права
    const [existingComment] = await db
      .select({ authorId: comments.authorId })
      .from(comments)
      .where(eq(comments.id, commentId));

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Получаем роль пользователя
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, auth.userId));

    // Проверяем, является ли пользователь автором или админом
    const isAuthor = existingComment.authorId === auth.userId;
    const isAdmin = user?.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Обновляем комментарий
    const [updatedComment] = await db
      .update(comments)
      .set({ content: data.content })
      .where(eq(comments.id, commentId))
      .returning();

    return res.status(200).json({ comment: updatedComment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.issues,
      });
    }
    throw error;
  }
};

/**
 * Удаление комментария
 */
const handleDeleteComment = async (req: VercelRequest, commentId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Получаем комментарий и проверяем права
  const [existingComment] = await db
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, commentId));

  if (!existingComment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  // Получаем роль пользователя
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, auth.userId));

  // Проверяем, является ли пользователь автором или админом
  const isAuthor = existingComment.authorId === auth.userId;
  const isAdmin = user?.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Удаляем комментарий
  await db.delete(comments).where(eq(comments.id, commentId));

  return res.status(204).send('');
};

export default handler;
