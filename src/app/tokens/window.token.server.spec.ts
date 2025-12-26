// @vitest-environment node
import { windowFactory } from './window.token';

describe('WINDOW Token (Server)', () => {
  it('factory should return empty object when window is undefined', () => {
    expect(windowFactory()).toEqual({});
  });
});
