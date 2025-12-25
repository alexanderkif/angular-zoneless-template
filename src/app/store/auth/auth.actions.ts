import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider?: string;
}

// Login actions
export const loginActions = createActionGroup({
  source: 'Auth/Login',
  events: {
    'Login': props<{ email: string; password: string; returnUrl?: string }>(),
    'Login Success': props<{ user: AuthUser; returnUrl?: string }>(),
    'Login Failure': props<{ error: string }>(),
  },
});

// Register actions
export const registerActions = createActionGroup({
  source: 'Auth/Register',
  events: {
    'Register': props<{ email: string; password: string; name: string }>(),
    'Register Success': props<{ user: AuthUser }>(),
    'Register Failure': props<{ error: string }>(),
  },
});

// OAuth actions
export const oauthActions = createActionGroup({
  source: 'Auth/OAuth',
  events: {
    'Github Login': emptyProps(),
    'Google Login': emptyProps(),
    'OAuth Success': props<{ user: AuthUser }>(),
    'OAuth Failure': props<{ error: string }>(),
  },
});

// Session actions
export const sessionActions = createActionGroup({
  source: 'Auth/Session',
  events: {
    'Check Session': emptyProps(),
    'Session Valid': props<{ user: AuthUser }>(),
    'Session Invalid': emptyProps(),
    'Logout': emptyProps(), // Optimistic - no success/failure needed
  },
});

// Token actions
export const tokenActions = createActionGroup({
  source: 'Auth/Token',
  events: {
    'Refresh Token': emptyProps(),
    'Refresh Token Success': props<{ user: AuthUser }>(),
    'Refresh Token Failure': props<{ error: string }>(),
  },
});
