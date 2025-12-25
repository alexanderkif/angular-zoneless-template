import { InjectionToken } from '@angular/core';
import { IncomingMessage } from 'node:http';

// Use a global symbol to ensure the token is a singleton across bundles (server.mjs and main.server.mjs)
const KEY = Symbol.for('NG_SSR_REQUEST_TOKEN');
const globalObj = globalThis as any;

if (!globalObj[KEY]) {
  globalObj[KEY] = new InjectionToken<IncomingMessage>('REQUEST');
}

export const REQUEST: InjectionToken<IncomingMessage> = globalObj[KEY];
