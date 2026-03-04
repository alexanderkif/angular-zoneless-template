# Logout Security Fix (January 2026)

## Проблема

При нажатии Logout и закрытии вкладки браузера пользователь мог оставаться авторизованным при повторном открытии сайта. Это происходило из-за того, что:

1. **Клиент** очищал локальный кеш **до** вызова API (оптимистичное обновление)
2. **Сервер** удалял refresh token из БД **асинхронно** без ожидания завершения
3. **Компонент** мог редиректить до завершения запроса logout

Если пользователь закрывал вкладку до завершения запроса, refresh token оставался в базе данных и HttpOnly cookies, позволяя повторную авторизацию.

## Решение (Best Practices 2026)

### 1. Клиент (`auth-query.service.ts`)

**Было** (неправильно):

```typescript
logoutMutation = () =>
  injectMutation(() => ({
    mutationFn: async () => {
      /* API call */
    },
    onMutate: async () => {
      // ❌ Очистка кеша ДО вызова API
      this.queryClient.setQueryData(['auth', 'currentUser'], null);
    },
  }));
```

**Стало** (правильно):

```typescript
logoutMutation = () =>
  injectMutation(() => ({
    mutationFn: async () => {
      // ✅ СНАЧАЛА вызываем API (обязательно дождаться)
      await lastValueFrom(this.http.post(`/auth/logout`, {}, { withCredentials: true }));
    },
    onSuccess: () => {
      // ✅ Очистка кеша ПОСЛЕ успешного logout на сервере
      this.queryClient.clear();
    },
    onError: () => {
      // ✅ Очистка кеша даже при ошибке (сеть недоступна)
      this.queryClient.clear();
    },
  }));
```

### 2. Компонент (`user-menu.component.ts`)

**Было** (неправильно):

```typescript
case 'exit':
  // ❌ Редирект ДО вызова logout
  if (isProtectedRoute) {
    this.router.navigate(['/']);
  }
  this.logoutMutation.mutate(undefined);
  break;
```

**Стало** (правильно):

```typescript
case 'exit':
  // ✅ Ждем завершения logout, затем редирект
  this.logoutMutation.mutate(undefined, {
    onSettled: () => {
      this.router.navigate(['/']);
    },
  });
  break;
```

### 3. Сервер (`api/auth/index.ts`)

**Было** (неправильно):

```typescript
async function handleLogout(req, res) {
  // ❌ Асинхронное удаление без ожидания
  if (refreshToken) {
    db.delete(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .then(
        () => {},
        (err) => console.error(err),
      );
  }

  res.setHeader('Set-Cookie', [
    /* clear cookies */
  ]);
  return res.status(200).json({ message: 'Logged out' });
}
```

**Стало** (правильно):

```typescript
async function handleLogout(req, res) {
  // ✅ Синхронное удаление с await
  if (refreshToken) {
    try {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    } catch (err) {
      console.error('Failed to delete token:', err);
      // Продолжаем очистку cookies даже при ошибке БД
    }
  }

  res.setHeader('Set-Cookie', [
    /* clear cookies */
  ]);
  return res.status(200).json({ message: 'Logged out' });
}
```

## Порядок выполнения Logout (Best Practice)

1. **Клиент** вызывает `logoutMutation.mutate()`
2. **Клиент** отправляет HTTP POST `/api/auth/logout`
3. **Сервер** удаляет refresh token из БД (`await db.delete()`)
4. **Сервер** устанавливает cookies с `Max-Age=0` для удаления
5. **Сервер** возвращает 200 OK
6. **Клиент** получает ответ и вызывает `onSuccess`
7. **Клиент** очищает локальный кеш TanStack Query
8. **Клиент** редиректит на главную страницу

## Безопасность

### До исправления ❌

- Refresh token остается в БД
- HttpOnly cookies остаются в браузере
- Пользователь может вернуться и быть авторизованным

### После исправления ✅

- Refresh token удаляется из БД **синхронно**
- HttpOnly cookies удаляются с `Max-Age=0`
- Даже если сеть недоступна, локальный кеш очищается
- Пользователь не может использовать старые токены

## Тестирование

Обновлены тесты в `user-menu.component.spec.ts`:

- Проверка вызова `logoutMutation.mutate()`
- Проверка `onSettled` callback
- Проверка редиректа **после** завершения logout

## Совместимость

- ✅ Angular 21+ zoneless
- ✅ TanStack Query v5
- ✅ HttpOnly cookies
- ✅ SSR hydration
- ✅ Vitest тесты

## Дополнительная защита

В будущем можно добавить:

1. **Fingerprinting** - привязка токена к устройству/браузеру
2. **IP validation** - проверка IP при refresh
3. **Token rotation** - уже реализовано
4. **Session limit** - уже реализовано (3 сессии на пользователя)
5. **Logout all devices** - endpoint для выхода со всех устройств

## Ссылки

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [HttpOnly Cookie Security](https://owasp.org/www-community/HttpOnly)
