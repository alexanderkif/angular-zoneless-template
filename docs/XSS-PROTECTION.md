# XSS Protection in Angular Zoneless Template

## Built-in Angular Protection

Angular автоматически защищает от XSS-атак следующими способами:

### 1. **Automatic Sanitization**

Angular автоматически санитизирует все значения, отображаемые через интерполяцию `{{ }}` и property binding `[property]`.

```html
<!-- ✅ БЕЗОПАСНО: Angular автоматически экранирует -->
<p>{{ post.content }}</p>
<div [innerHTML]="post.content"></div>
<!-- Санитизируется перед рендерингом -->
```

### 2. **DomSanitizer для явного контроля**

Если нужно отобразить HTML (например, для Markdown), используйте `DomSanitizer`:

```typescript
import { DomSanitizer } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

get safeHtml() {
  return this.sanitizer.sanitize(SecurityContext.HTML, this.rawHtml);
}
```

### 3. **Контекст безопасности**

Angular различает разные контексты:

- **HTML**: `<div [innerHTML]="value">`
- **Style**: `<div [style.color]="value">`
- **URL**: `<a [href]="value">`
- **Resource URL**: `<script [src]="value">`

## Наша реализация

### Backend валидация (API)

В файлах [api/posts/index.ts](../api/posts/index.ts) и [api/comments/index.ts](../api/comments/index.ts) используется **Zod** для валидации:

```typescript
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});
```

**Zod не выполняет санитизацию**, но ограничивает длину и тип данных.

### Frontend защита (Angular)

В компонентах мы используем стандартную интерполяцию:

```html
<!-- В post.component.html -->
<h1 class="title">{{ post.title }}</h1>
<p class="text">{{ post.content }}</p>

<!-- В post-details.component.html -->
<div class="post-details__body">{{ post.content }}</div>
<p class="comment-content">{{ comment.content }}</p>
```

Angular **автоматически экранирует** эти значения, защищая от XSS.

## Потенциальные уязвимости и решения

### ❌ Небезопасно: Использование innerHTML без санитизации

```html
<div [innerHTML]="post.content"></div>
```

Хотя Angular санитизирует это, лучше избегать `innerHTML` без необходимости.

### ✅ Безопасно: Использование текстовой интерполяции

```html
<div>{{ post.content }}</div>
```

### ✅ Безопасно: Для Markdown используйте специальные библиотеки

```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const cleanHtml = DOMPurify.sanitize(marked.parse(markdown));
```

## Рекомендации

1. **✅ Текущая реализация безопасна** - используется только текстовая интерполяция
2. **✅ Zod валидация** на backend защищает от некорректных данных
3. **✅ Angular санитизация** автоматически активна
4. **⚠️ База данных**: PostgreSQL параметризованные запросы (Drizzle ORM) защищают от SQL injection
5. **⚠️ CSRF**: Используйте HttpOnly cookies (уже реализовано в [api/\_lib/security.ts](../api/_lib/security.ts))

## Дополнительная защита (опционально)

Если нужна поддержка Markdown или rich text, добавьте:

```bash
npm install dompurify marked
npm install -D @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';

// В компоненте
get sanitizedContent() {
  const html = marked.parse(this.post.content);
  const clean = DOMPurify.sanitize(html);
  return this.sanitizer.sanitize(SecurityContext.HTML, clean);
}
```

## Вывод

**Текущая реализация защищена от XSS** благодаря:

- Автоматической санитизации Angular
- Использованию текстовой интерполяции вместо innerHTML
- Валидации на backend через Zod
- Параметризованным запросам через Drizzle ORM

Никаких дополнительных мер не требуется, если не планируется поддержка rich text или Markdown.
