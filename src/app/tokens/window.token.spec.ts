import { TestBed } from '@angular/core/testing';
import { WINDOW, windowFactory } from './window.token';
import { provideZonelessChangeDetection } from '@angular/core';

describe('WINDOW Token', () => {
  it('should provide window in browser', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
    const windowToken = TestBed.inject(WINDOW);
    expect(windowToken).toBe(window);
  });

  it('factory should return window in browser', () => {
    expect(windowFactory()).toBe(window);
  });
});
