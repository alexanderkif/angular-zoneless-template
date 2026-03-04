# Инструкция по применению миграции постов

## Что было реализовано

✅ **База данных:**

- Таблица `posts` с полями: title, content, author_id, created_at, updated_at
- Таблица `comments` с полями: content, post_id, author_id, created_at, updated_at
- Добавлено поле `role` (user/admin) в таблицу `users`
- Row Level Security (RLS) политики для контроля доступа
- Автоматические триггеры для updated_at

✅ **Backend API:**

- `GET /api/posts` - Список постов с пагинацией
- `POST /api/posts` - Создание поста (требует авторизации)
- `GET /api/posts/[id]` - Получение поста с комментариями
- `PUT /api/posts/[id]` - Редактирование (только автор или админ)
- `DELETE /api/posts/[id]` - Удаление (только автор или админ)
- `POST /api/comments` - Создание комментария
- `PUT /api/comments/[id]` - Редактирование комментария
- `DELETE /api/comments/[id]` - Удаление комментария

✅ **Frontend (Angular):**

- Обновлен PostService с новыми типами и методами
- Создан PostsStore (NgRx Signals) для управления состоянием
- Обновлен PostQueryService для TanStack Query
- Обновлены компоненты для отображения автора, дат, аватаров
- Добавлена форма и список комментариев на странице деталей поста
- Поддержка редактирования и удаления (с проверкой прав)

✅ **Безопасность:**

- XSS защита: Angular автоматически санитизирует вывод
- SQL Injection: Drizzle ORM использует параметризованные запросы
- CSRF: HttpOnly cookies
- Авторизация: JWT токены с проверкой на backend
- Валидация: Zod схемы на backend

## Применение миграции

### Вариант 1: Supabase Dashboard (Рекомендуется)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Откройте файл `supabase/migrations/20260121_posts_comments.sql`
5. Скопируйте и вставьте содержимое в SQL Editor
6. Нажмите **Run**

### Вариант 2: Через Supabase CLI

```bash
# Если Supabase CLI установлен
supabase db push

# Или сбросить и применить все миграции
supabase db reset
```

### Вариант 3: Через psql (если установлен PostgreSQL)

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260121_posts_comments.sql
```

## После миграции

### 1. Создайте первого админа

Выполните в SQL Editor:

```sql
-- Найдите своего пользователя
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';

-- Назначьте роль admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 2. Запустите dev сервер

```bash
npm run dev
```

Это запустит:

- API на `http://localhost:3000`
- Angular SSR на `http://localhost:4200`

### 3. Проверьте функциональность

1. Зарегистрируйтесь или войдите
2. Перейдите на `/posts` - должен быть пустой список
3. Создайте первый пост (функция пока не добавлена в UI)
4. Откройте детали поста - должна быть форма комментариев

## Создание поста вручную (временно)

Пока UI для создания постов не добавлен, можно создать через API:

```bash
# Получите access token из DevTools (Application > Cookies)
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Мой первый пост",
    "content": "Это содержимое моего первого поста!"
  }'
```

## Следующие шаги (опционально)

- [ ] Добавить UI для создания поста (кнопка "New Post")
- [ ] Добавить UI для редактирования постов
- [ ] Добавить поддержку Markdown
- [ ] Добавить загрузку изображений
- [ ] Добавить пагинацию для комментариев
- [ ] Добавить "лайки" для постов
- [ ] Добавить поиск по постам

## Проверка миграции

После применения выполните:

```sql
-- Проверка структуры
\d posts
\d comments

-- Проверка политик
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('posts', 'comments');

-- Проверка индексов
SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('posts', 'comments');
```
