# Миграция базы данных для постов и комментариев

## Как применить миграцию

### Локальная разработка

Если используется Supabase CLI:

```bash
supabase db reset
```

Или примените миграцию вручную:

```bash
psql $DATABASE_URL -f supabase/migrations/20260121_posts_comments.sql
```

### Production (Vercel + Supabase)

1. Через Supabase Dashboard:
   - Перейдите в SQL Editor
   - Скопируйте содержимое файла `supabase/migrations/20260121_posts_comments.sql`
   - Выполните SQL

2. Или через CLI (если настроен доступ к production):
   ```bash
   supabase db push
   ```

## Создание первого админа

После применения миграции создайте первого пользователя с ролью admin:

```sql
-- Найдите вашего пользователя
SELECT id, email, role FROM users;

-- Назначьте роль admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Проверка

Проверьте, что таблицы созданы:

```sql
-- Проверка таблиц
SELECT * FROM posts LIMIT 5;
SELECT * FROM comments LIMIT 5;

-- Проверка индексов
SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('posts', 'comments');

-- Проверка политик RLS
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('posts', 'comments');
```

## Откат миграции (если нужно)

```sql
-- Удалить таблицы
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Удалить колонку role из users
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Удалить enum type
DROP TYPE IF EXISTS user_role;
```
