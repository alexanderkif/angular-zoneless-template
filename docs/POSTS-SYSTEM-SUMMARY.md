# Posts and Comments System - Summary

## 🎯 Реализованная функциональность

Полноценная система постов с комментариями, авторством, правами доступа и защитой от XSS.

## 📊 Структура базы данных

### Таблица `posts`

```sql
- id: UUID (PK)
- title: TEXT (1-200 символов)
- content: TEXT (1-50000 символов)
- author_id: UUID (FK -> users.id)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ (автообновление)
```

### Таблица `comments`

```sql
- id: UUID (PK)
- content: TEXT (1-10000 символов)
- post_id: UUID (FK -> posts.id)
- author_id: UUID (FK -> users.id)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ (автообновление)
```

### Обновление `users`

```sql
+ role: ENUM('user', 'admin') - роль пользователя
```

## 🔐 Политики безопасности (RLS)

### Posts

- ✅ **Чтение**: Все пользователи (включая неавторизованных)
- ✅ **Создание**: Только авторизованные пользователи
- ✅ **Редактирование**: Только автор поста
- ✅ **Удаление**: Автор поста или админ

### Comments

- ✅ **Чтение**: Все пользователи
- ✅ **Создание**: Только авторизованные пользователи
- ✅ **Редактирование**: Только автор комментария
- ✅ **Удаление**: Автор комментария или админ

## 🚀 API Endpoints

### Posts

```
GET    /api/posts              - Список постов (пагинация)
POST   /api/posts              - Создать пост (🔒 auth)
GET    /api/posts/[id]         - Получить пост с комментариями
PUT    /api/posts/[id]         - Обновить пост (🔒 author/admin)
DELETE /api/posts/[id]         - Удалить пост (🔒 author/admin)
```

### Comments

```
POST   /api/comments           - Создать комментарий (🔒 auth)
PUT    /api/comments/[id]      - Обновить комментарий (🔒 author/admin)
DELETE /api/comments/[id]      - Удалить комментарий (🔒 author/admin)
```

## 🎨 Frontend компоненты

### Обновленные

- `PostComponent` - Отображает автора, дату, аватар, badge админа
- `PostsListComponent` - Список постов с пагинацией
- `PostDetailsComponent` - Детали поста + форма комментариев + список комментариев

### Сервисы

- `PostService` - HTTP методы для постов и комментариев
- `PostQueryService` - TanStack Query integration
- `PostsStore` - NgRx Signals state management

## 🛡️ Защита от уязвимостей

### XSS (Cross-Site Scripting)

✅ **Angular автоматическая санитизация**

- Все значения в `{{ }}` экранируются
- `[innerHTML]` санитизируется DomSanitizer
- Документация: [docs/XSS-PROTECTION.md](./XSS-PROTECTION.md)

### SQL Injection

✅ **Drizzle ORM параметризованные запросы**

- Используются плейсхолдеры вместо конкатенации строк
- Автоматическое экранирование значений

### CSRF (Cross-Site Request Forgery)

✅ **HttpOnly Cookies**

- Refresh token хранится в HttpOnly cookie
- Недоступен для JavaScript
- Реализовано в [api/\_lib/security.ts](../api/_lib/security.ts)

### Authorization

✅ **JWT с проверкой на каждом endpoint**

- Access token проверяется через `verifyAccessToken()`
- Проверка прав автора/админа перед изменением

## 📦 Файлы миграции

- `supabase/migrations/20260121_posts_comments.sql` - SQL миграция
- `api/db/schema.ts` - Drizzle ORM схема

## 🔧 Как запустить

### 1. Применить миграцию

См. [docs/SETUP-POSTS.md](./SETUP-POSTS.md)

### 2. Создать первого админа

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 3. Запустить dev сервер

```bash
npm run dev
```

## 📋 Что можно улучшить

### Высокий приоритет

- [ ] UI для создания нового поста (кнопка "Create Post")
- [ ] UI для редактирования постов (кнопка "Edit" для автора)
- [ ] Проверка прав в UI (показывать кнопки редактирования только автору/админу)

### Средний приоритет

- [ ] Поддержка Markdown в постах (с санитизацией через DOMPurify)
- [ ] Загрузка изображений для постов
- [ ] Пагинация для комментариев (если комментариев много)
- [ ] Поиск по постам
- [ ] Фильтрация постов (по автору, по дате)

### Низкий приоритет

- [ ] Система "лайков" для постов
- [ ] Уведомления о новых комментариях
- [ ] Теги для постов
- [ ] Черновики постов (draft status)

## 🧪 Тестирование

Необходимо добавить тесты для:

- [ ] API endpoints (unit tests)
- [ ] PostService (unit tests)
- [ ] PostComponent (component tests)
- [ ] E2E тесты для создания/редактирования/удаления постов
- [ ] E2E тесты для комментариев

## 📚 Документация

- [XSS-PROTECTION.md](./XSS-PROTECTION.md) - Защита от XSS атак
- [SETUP-POSTS.md](./SETUP-POSTS.md) - Инструкция по применению миграции
- [POSTS-MIGRATION.md](./POSTS-MIGRATION.md) - Детали миграции базы данных

## ❓ FAQ

**Q: Можно ли использовать Markdown в постах?**
A: Да, но нужно добавить библиотеку DOMPurify для санитизации. См. [XSS-PROTECTION.md](./XSS-PROTECTION.md)

**Q: Как сделать пользователя админом?**
A: Выполните SQL: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com'`

**Q: Почему админ может удалять чужие посты?**
A: Это стандартная функция модерации. Админ отвечает за контент на платформе.

**Q: Можно ли добавить приватные посты?**
A: Да, добавьте поле `is_public: BOOLEAN` в таблицу posts и обновите RLS политики.
