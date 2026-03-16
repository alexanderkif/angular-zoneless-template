import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../server/db';
import { comments, posts, users } from '../server/db/schema';
import { resolveAuthenticatedUser } from '../server/_lib/auth-user';
import { handleCors } from '../server/_lib/cors';
import { toPublicEntityListWithAuthor, toPublicEntityWithAuthor } from '../server/_lib/public-dto';
import { setSecurityHeaders } from '../server/_lib/security';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolvePostId = (req: VercelRequest): string | null => {
  const id = req.query['id'];
  if (typeof id === 'string' && UUID_REGEX.test(id)) return id;
  return null;
};

const handleGetPosts = async (req: VercelRequest, res: VercelResponse) => {
  const { page, limit } = querySchema.parse(req.query);

  const auth = await resolveAuthenticatedUser(req, true);
  const userId = auth.userId;

  const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
  const total = totalResult[0]?.count ?? 0;

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
        avatarUrl: users.avatarUrl,
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
    posts: toPublicEntityListWithAuthor(postsList),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};

const handleCreatePost = async (req: VercelRequest, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = createPostSchema.parse(req.body);

  const [newPost] = await db
    .insert(posts)
    .values({
      title: data.title,
      content: data.content,
      authorId: auth.userId,
    })
    .returning();

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
        avatarUrl: users.avatarUrl,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, newPost.id));

  return res.status(201).json({ post: toPublicEntityWithAuthor(postWithAuthor[0]) });
};

const handleGetPost = async (postId: string, res: VercelResponse, req: VercelRequest) => {
  let userId: string | null = null;
  const auth = await resolveAuthenticatedUser(req, true);
  userId = auth.userId;

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
        avatarUrl: users.avatarUrl,
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
        avatarUrl: users.avatarUrl,
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
    post: toPublicEntityWithAuthor(postResult[0]),
    comments: toPublicEntityListWithAuthor(commentsList),
  });
};

const handleUpdatePost = async (req: VercelRequest, postId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = updatePostSchema.parse(req.body);

  if (!data.title && !data.content) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const [existingPost] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId));

  if (!existingPost) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, auth.userId));

  const isAuthor = existingPost.authorId === auth.userId;
  const isAdmin = user?.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db
    .update(posts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(posts.id, postId));

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
        avatarUrl: users.avatarUrl,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId));

  return res.status(200).json({ post: toPublicEntityWithAuthor(updatedPost[0]) });
};

const handleDeletePost = async (req: VercelRequest, postId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [existingPost] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId));

  if (!existingPost) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, auth.userId));

  const isAuthor = existingPost.authorId === auth.userId;
  const isAdmin = user?.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.delete(posts).where(eq(posts.id, postId));

  return res.status(204).send('');
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const corsResult = handleCors(req, res);
  if (corsResult) return corsResult;
  setSecurityHeaders(res);

  try {
    const postId = resolvePostId(req);

    if (req.method === 'GET') {
      if (postId) return await handleGetPost(postId, res, req);
      return await handleGetPosts(req, res);
    }

    if (req.method === 'POST') {
      if (postId) return res.status(405).json({ error: 'Method not allowed' });
      return await handleCreatePost(req, res);
    }

    if (req.method === 'PUT') {
      if (!postId) return res.status(400).json({ error: 'Post ID is required' });
      return await handleUpdatePost(req, postId, res);
    }

    if (req.method === 'DELETE') {
      if (!postId) return res.status(400).json({ error: 'Post ID is required' });
      return await handleDeletePost(req, postId, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.issues });
    }

    console.error('Posts API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
