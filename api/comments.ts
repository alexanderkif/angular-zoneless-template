import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { comments, users } from '../server/db/schema';
import { resolveAuthenticatedUser } from '../server/_lib/auth-user';
import { handleCors } from '../server/_lib/cors';
import { setSecurityHeaders } from '../server/_lib/security';

const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

const resolveCommentId = (req: VercelRequest): string | null => {
  const id = req.query['id'];
  if (typeof id === 'string' && id.trim()) return id;
  return null;
};

const handleCreateComment = async (req: VercelRequest, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
};

const handleUpdateComment = async (req: VercelRequest, commentId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = updateCommentSchema.parse(req.body);

  const [existingComment] = await db
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, commentId));

  if (!existingComment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, auth.userId));

  const isAuthor = existingComment.authorId === auth.userId;
  const isAdmin = user?.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const [updatedComment] = await db
    .update(comments)
    .set({ content: data.content })
    .where(eq(comments.id, commentId))
    .returning();

  return res.status(200).json({ comment: updatedComment });
};

const handleDeleteComment = async (req: VercelRequest, commentId: string, res: VercelResponse) => {
  const auth = await resolveAuthenticatedUser(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [existingComment] = await db
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, commentId));

  if (!existingComment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, auth.userId));

  const isAuthor = existingComment.authorId === auth.userId;
  const isAdmin = user?.role === 'admin';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  return res.status(204).send('');
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const corsResult = handleCors(req, res);
  if (corsResult) return corsResult;
  setSecurityHeaders(res);

  try {
    const commentId = resolveCommentId(req);

    if (req.method === 'POST') {
      if (commentId) return res.status(405).json({ error: 'Method not allowed' });
      return await handleCreateComment(req, res);
    }

    if (req.method === 'PUT') {
      if (!commentId) return res.status(400).json({ error: 'Comment ID is required' });
      return await handleUpdateComment(req, commentId, res);
    }

    if (req.method === 'DELETE') {
      if (!commentId) return res.status(400).json({ error: 'Comment ID is required' });
      return await handleDeleteComment(req, commentId, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.issues });
    }

    console.error('Comment API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
