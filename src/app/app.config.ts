import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { provideStore, provideState, Store } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { loggingInterceptor } from './interceptors/loggingInterceptor';
import { usersFeature } from './store/users/users.reducer';
import { UsersEffects } from './store/users/users.effects';
import { initUser } from './store/users/actions/users.user.actions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([loggingInterceptor])),
    provideStore(),
    provideState(usersFeature),
    provideEffects([UsersEffects]),
    provideAppInitializer(() => {
      const store = inject(Store);
      store.dispatch(initUser());
    }),
    provideStoreDevtools({
      maxAge: 25, // Retains last 25 states
      logOnly: !isDevMode(), // Restrict extension to log-only mode
      // autoPause: true, // Pauses recording actions and state changes when the extension window is not open
      // trace: false, //  If set to true, will include stack trace for every dispatched action, so you can see it in trace tab jumping directly to that part of code
      // traceLimit: 75, // maximum stack trace frames to be stored (in case trace option was provided as true)
      // connectInZone: true // If set to true, the connection is established within the Angular zone
    }),
  ],
};
