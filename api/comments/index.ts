import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../db';
import { comments } from '../db/schema';
import { resolveAuthenticatedUser } from '../_lib/auth-user';
import { handleCors } from '../_lib/cors';

// Схема для создания комментария
const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

/**
 * POST /api/comments - Создание нового комментария
 */
const handler = async (req: VercelRequest, res: VercelResponse) => {
  const corsResult = handleCors(req, res);
  if (corsResult) return corsResult;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверяем аутентификацию
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = createCommentSchema.parse(req.body);

    const [newComment] = await db
      .insert(comments)
      .values({
        postId: data.postId,
        content: data.content,
        authorId: auth.userId,
      })
      .returning();

    return res.status(201).json({ comment: newComment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.issues,
      });
    }
    console.error('Create comment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
