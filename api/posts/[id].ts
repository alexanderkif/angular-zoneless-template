import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { comments, posts, users } from '../db/schema';
import { resolveAuthenticatedUser } from '../_lib/auth-user';
import { handleCors } from '../_lib/cors';

// Схема для обновления поста
const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
});

/**
 * GET /api/posts/[id] - Получение поста по ID с комментариями
 * PUT /api/posts/[id] - Обновление поста (требует аутентификации)
 * DELETE /api/posts/[id] - Удаление поста (требует аутентификации)
 */
const handler = async (req: VercelRequest, res: VercelResponse) => {
  const corsResult = handleCors(req, res);
  if (corsResult) return corsResult;

  const postId = req.query['id'] as string;

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  try {
    if (req.method === 'GET') {
      return await handleGetPost(postId, res, req);
    }

    if (req.method === 'PUT') {
      return await handleUpdatePost(req, postId, res);
    }

    if (req.method === 'DELETE') {
      return await handleDeletePost(req, postId, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Post API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получение поста по ID с комментариями
 */
const handleGetPost = async (postId: string, res: VercelResponse, req?: VercelRequest) => {
  // Получаем userId только при валидной активной сессии
  let userId: string | null = null;
  if (req) {
    const auth = await resolveAuthenticatedUser(req, true);
    userId = auth.userId;
  }

  // Получаем пост с информацией об авторе и реакциями
  const postResult = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
      },
      likes: sql<number>`(
        SELECT count(*)::int FROM post_reactions
        WHERE post_id = ${posts.id} AND reaction = 1
      )`,
      dislikes: sql<number>`(
        SELECT count(*)::int FROM post_reactions
        WHERE post_id = ${posts.id} AND reaction = -1
      )`,
      userReaction: userId
        ? sql<number | null>`(
            SELECT reaction FROM post_reactions
            WHERE post_id = ${posts.id} AND user_id = ${userId}
          )`
        : sql<null>`NULL`,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId));

  if (!postResult.length) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Получаем комментарии к посту с реакциями
  const commentsList = await db
    .select({
      id: comments.id,
      content: comments.content,
      postId: comments.postId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
      },
      likesCount: sql<number>`(
        SELECT count(*)::int FROM comment_reactions
        WHERE comment_id = ${comments.id} AND reaction = 1
      )`,
      dislikesCount: sql<number>`(
        SELECT count(*)::int FROM comment_reactions
        WHERE comment_id = ${comments.id} AND reaction = -1
      )`,
      userReaction: userId
        ? sql<'like' | 'dislike' | null>`(
            CASE
              WHEN EXISTS (SELECT 1 FROM comment_reactions WHERE comment_id = ${comments.id} AND user_id = ${userId} AND reaction = 1) THEN 'like'
              WHEN EXISTS (SELECT 1 FROM comment_reactions WHERE comment_id = ${comments.id} AND user_id = ${userId} AND reaction = -1) THEN 'dislike'
              ELSE NULL
            END
          )`
        : sql<null>`NULL`,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));

  return res.status(200).json({
    post: postResult[0],
    comments: commentsList,
  });
};

/**
 * Обновление поста
 */
const handleUpdatePost = async (req: VercelRequest, postId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = updatePostSchema.parse(req.body);

    if (!data.title && !data.content) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // Получаем пост и проверяем права
    const [existingPost] = await db
      .select({ authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId));

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Получаем роль пользователя
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, auth.userId));

    // Проверяем, является ли пользователь автором или админом
    const isAuthor = existingPost.authorId === auth.userId;
    const isAdmin = user?.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Обновляем пост
    await db.update(posts).set(data).where(eq(posts.id, postId));

    // Получаем обновленный пост с информацией об авторе
    const updatedPost = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, postId));

    return res.status(200).json({ post: updatedPost[0] });
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
 * Удаление поста
 */
const handleDeletePost = async (req: VercelRequest, postId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Получаем пост и проверяем права
  const [existingPost] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId));

  if (!existingPost) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Получаем роль пользователя
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, auth.userId));

  // Проверяем, является ли пользователь автором или админом
  const isAuthor = existingPost.authorId === auth.userId;
  const isAdmin = user?.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Удаляем пост (комментарии удалятся автоматически через CASCADE)
  await db.delete(posts).where(eq(posts.id, postId));

  return res.status(204).send('');
};

export default handler;
