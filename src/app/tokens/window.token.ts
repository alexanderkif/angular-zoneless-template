import { InjectionToken } from '@angular/core';

export const windowFactory = (): Window => {
  return typeof window !== 'undefined' ? window : ({} as Window);
};

export const WINDOW = new InjectionToken<Window>('Window', {
  factory: windowFactory,
});
