# Применение миграции для системы лайков

## Шаг 1: Примените миграцию в Supabase

1. Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Скопируйте содержимое файла `supabase/migrations/20260121_likes_system.sql`
3. Вставьте SQL в редактор и выполните

## Шаг 2: Обновите API для получения лайков

Необходимо обновить API-эндпоинты, чтобы они возвращали количество лайков/дизлайков и текущую реакцию пользователя.

### Обновления в api/posts/index.ts

Добавьте агрегацию лайков в GET `/api/posts`:

\`\`\`typescript
// В handleGetPosts добавьте JOIN для подсчета реакций:
const postsWithAuthors = await db
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
likes: sql<number>\`count(CASE WHEN \${postReactions.reaction} = 1 THEN 1 END)::int\`,
dislikes: sql<number>\`count(CASE WHEN \${postReactions.reaction} = -1 THEN 1 END)::int\`,
userReaction: sql<number | null>\`
(SELECT reaction FROM \${postReactions}
WHERE post_id = \${posts.id}
AND user_id = \${userId})
\`,
})
.from(posts)
.leftJoin(users, eq(posts.authorId, users.id))
.leftJoin(postReactions, eq(posts.id, postReactions.postId))
.groupBy(posts.id, users.id)
.orderBy(desc(posts.createdAt))
.limit(limit)
.offset(offset);
\`\`\`

### Обновления в api/posts/[id].ts

Добавьте агрегацию лайков для поста и комментариев в GET `/api/posts/:id`:

\`\`\`typescript
// Получить пост с лайками
const postData = await db
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
likes: sql<number>\`(
SELECT count(_)::int FROM \${postReactions}
WHERE post_id = \${posts.id} AND reaction = 1
)\`,
dislikes: sql<number>\`(
SELECT count(_)::int FROM \${postReactions}
WHERE post_id = \${posts.id} AND reaction = -1
)\`,
userReaction: sql<number | null>\`(
SELECT reaction FROM \${postReactions}
WHERE post_id = \${posts.id} AND user_id = \${userId}
)\`,
})
.from(posts)
.leftJoin(users, eq(posts.authorId, users.id))
.where(eq(posts.id, id));

// Получить комментарии с лайками
const commentsData = await db
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
likes: sql<number>\`(
SELECT count(_)::int FROM \${commentReactions}
WHERE comment_id = \${comments.id} AND reaction = 1
)\`,
dislikes: sql<number>\`(
SELECT count(_)::int FROM \${commentReactions}
WHERE comment_id = \${comments.id} AND reaction = -1
)\`,
userReaction: sql<number | null>\`(
SELECT reaction FROM \${commentReactions}
WHERE comment_id = \${comments.id} AND user_id = \${userId}
)\`,
})
.from(comments)
.leftJoin(users, eq(comments.authorId, users.id))
.where(eq(comments.postId, id))
.orderBy(comments.createdAt);
\`\`\`

## Шаг 3: Протестируйте

1. Запустите `npm run dev`
2. Войдите в систему
3. Перейдите на страницу `/posts`
4. Нажмите на FAB кнопку справа внизу, чтобы создать новый пост
5. Попробуйте поставить лайк/дизлайк на пост
6. Откройте детали поста и попробуйте лайкнуть комментарий

## Примечания

- Система использует оптимистичные обновления через TanStack Query
- Лайки и дизлайки работают как переключатели (повторный клик убирает реакцию)
- Можно выбрать только одну реакцию (либо лайк, либо дизлайк)
- API endpoint `/api/reactions` обрабатывает все реакции для постов и комментариев
