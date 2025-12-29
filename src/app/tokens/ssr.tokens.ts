import { IncomingMessage } from 'node:http';
import { InjectionToken } from '@angular/core';

// Use a global symbol to ensure the token is a singleton across bundles (server.mjs and main.server.mjs)
const KEY = Symbol.for('NG_SSR_REQUEST_TOKEN');
const globalObj = globalThis as any;

const createRequestToken = () => {
  return new InjectionToken<IncomingMessage>('REQUEST');
};

// Ensure there is a singleton token stored on the global object
/* v8 ignore start */
if (!globalObj[KEY]) {
  globalObj[KEY] = createRequestToken();
}
/* v8 ignore stop */

export const REQUEST: InjectionToken<IncomingMessage> = globalObj[KEY];

// Helper to get (and if necessary create) the singleton token — used by tests
export const getRequestToken = (): InjectionToken<IncomingMessage> => {
  if (!globalObj[KEY] || !(globalObj[KEY] instanceof InjectionToken)) {
    globalObj[KEY] = createRequestToken();
  }
  return globalObj[KEY];
};
