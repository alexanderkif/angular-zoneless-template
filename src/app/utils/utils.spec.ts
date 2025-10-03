import { getRandomInt } from './utils';

describe('Utils', () => {
  it('should generate a random integer between the given range', () => {
    const min = 1;
    const max = 10;
    const randomInt = getRandomInt(min, max);
    expect(randomInt).toBeGreaterThanOrEqual(min);
    expect(randomInt).toBeLessThanOrEqual(max);
  });

  it('should return the min value when min and max are the same', () => {
    const min = 5;
    const max = 5;
    const randomInt = getRandomInt(min, max);
    expect(randomInt).toBe(min);
  });
});
