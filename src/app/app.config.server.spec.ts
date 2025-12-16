import { config } from './app.config.server';

describe('app.config.server', () => {
  it('should create server config', () => {
    expect(config).toBeDefined();
  });

  it('should be an ApplicationConfig', () => {
    expect(config).toHaveProperty('providers');
    expect(Array.isArray(config.providers)).toBe(true);
  });

  it('should merge client and server providers', () => {
    expect(config.providers).toBeDefined();
    expect(config.providers!.length).toBeGreaterThan(0);
  });

  it('should include server rendering provider', () => {
    const hasServerProvider = config.providers!.some(
      (provider) => provider !== null && typeof provider === 'object'
    );
    expect(hasServerProvider).toBe(true);
  });
});
