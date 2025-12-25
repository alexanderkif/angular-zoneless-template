import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { IncomingMessage } from 'node:http';

/**
 * SSR Cookie Interceptor
 * 
 * Best Practice 2025: На сервере перекладываем cookies из входящего запроса браузера
 * в исходящие запросы к API. Это позволяет SSR использовать токены пользователя
 * для получения данных до рендеринга страницы.
 * 
 * Uses AsyncLocalStorage via globalThis to access request context reliably.
 */
export const ssrCookieInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  
  // Работает только на сервере
  if (isPlatformServer(platformId)) {
    try {
      // Получаем request из AsyncLocalStorage (через globalThis)
      const storage = (globalThis as any).requestStorage;
      const request = storage?.getStore() as IncomingMessage | undefined;
      
      if (request?.headers?.cookie) {
        const cookieHeader = Array.isArray(request.headers.cookie)
          ? request.headers.cookie.join('; ')
          : request.headers.cookie;
          
        // Перекладываем куки из запроса браузера в запрос к API
        req = req.clone({
          setHeaders: {
            'Cookie': cookieHeader,
            // Добавляем заголовок для защиты от CSRF
            'X-Requested-With': 'XMLHttpRequest',
          },
          // Важно: withCredentials должен быть true для передачи cookies
          withCredentials: true,
        });
      }
    } catch (err) {
      // REQUEST token может быть недоступен в некоторых случаях
      console.warn('SSR Cookie Interceptor: REQUEST token not available', err);
    }
  }
  
  return next(req);
};
