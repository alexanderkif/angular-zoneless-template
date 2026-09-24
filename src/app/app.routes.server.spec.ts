import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('app.routes.server', () => {
  it('should define server routes', () => {
    expect(serverRoutes).toBeDefined();
    expect(Array.isArray(serverRoutes)).toBe(true);
  });

  it('should define three server routes', () => {
    expect(serverRoutes).toHaveLength(3);
  });

  it('should have catch-all route rendered on the server', () => {
    const catchAllRoute = serverRoutes.find((route) => route.path === '**');

    expect(catchAllRoute).toBeDefined();
    expect(catchAllRoute?.renderMode).toBe(RenderMode.Server);
  });

  it('should render auth/callback on the client', () => {
    const route = serverRoutes.find((item) => item.path === 'auth/callback');

    expect(route).toBeDefined();
    expect(route?.renderMode).toBe(RenderMode.Client);
  });

  it('should render verify-email on the client', () => {
    const route = serverRoutes.find((item) => item.path === 'verify-email');

    expect(route).toBeDefined();
    expect(route?.renderMode).toBe(RenderMode.Client);
  });
});
