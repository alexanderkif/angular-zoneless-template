import { serverRoutes } from './app.routes.server';
import { RenderMode } from '@angular/ssr';

describe('app.routes.server', () => {
  it('should define server routes', () => {
    expect(serverRoutes).toBeDefined();
    expect(Array.isArray(serverRoutes)).toBe(true);
  });

  it('should have at least one route', () => {
    expect(serverRoutes.length).toBeGreaterThan(0);
  });

  it('should have catch-all route', () => {
    const catchAllRoute = serverRoutes.find((route) => route.path === '**');
    expect(catchAllRoute).toBeDefined();
  });

  it('should use Server render mode', () => {
    const catchAllRoute = serverRoutes.find((route) => route.path === '**');
    expect(catchAllRoute?.renderMode).toBe(RenderMode.Server);
  });
});
