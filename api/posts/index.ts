import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { posts, users } from '../db/schema';
import { resolveAuthenticatedUser } from '../_lib/auth-user';
import { handleCors } from '../_lib/cors';

// Схема для валидации query параметров
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Схема для создания поста
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

/**
 * GET /api/posts - Получение списка постов с пагинацией
 * POST /api/posts - Создание нового поста (требует аутентификации)
 */
const handler = async (req: VercelRequest, res: VercelResponse) => {
  const corsResult = handleCors(req, res);
  if (corsResult) return corsResult;

  try {
    if (req.method === 'GET') {
      return await handleGetPosts(req, res);
    }

    if (req.method === 'POST') {
      return await handleCreatePost(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Posts API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получение списка постов с пагинацией
 */
const handleGetPosts = async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { page, limit } = querySchema.parse(req.query);

    // Получаем userId только при валидной активной сессии
    const auth = await resolveAuthenticatedUser(req, true);
    const userId = auth.userId;

    // Получаем общее количество постов
    const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
    const total = totalResult[0]?.count ?? 0;

    // Получаем посты с информацией об авторе и реакциями
    const postsList = await db
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
        commentsCount: sql<number>`(
          SELECT count(*)::int FROM comments
          WHERE post_id = ${posts.id}
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
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      posts: postsList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.issues,
      });
    }
    throw error;
  }
};

/**
 * Создание нового поста
 */
const handleCreatePost = async (req: VercelRequest, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = createPostSchema.parse(req.body);

    const [newPost] = await db
      .insert(posts)
      .values({
        title: data.title,
        content: data.content,
        authorId: auth.userId,
      })
      .returning();

    // Получаем информацию об авторе
    const postWithAuthor = await db
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
      .where(eq(posts.id, newPost.id));

    return res.status(201).json({ post: postWithAuthor[0] });
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

export default handler;
