import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QueryClient, dehydrate } from '@tanstack/angular-query-experimental';
import { hydrateTanStackQuery, QUERY_STATE_KEY } from './ssr-tanstack-hydration';

describe('hydrateTanStackQuery', () => {
  it('should serialize query cache on server', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['server-key'], { value: 1 });

    TestBed.configureTestingModule({
      providers: [
        { provide: QueryClient, useValue: queryClient },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    TestBed.runInInjectionContext(() => hydrateTanStackQuery());

    const transferState = TestBed.inject(TransferState);
    expect(transferState.get(QUERY_STATE_KEY, null)).toBeTruthy();
  });

  it('should hydrate query cache on browser when transfer state exists', () => {
    const sourceClient = new QueryClient();
    sourceClient.setQueryData(['browser-key'], { value: 2 });
    const dehydrated = dehydrate(sourceClient);

    const queryClient = new QueryClient();

    TestBed.configureTestingModule({
      providers: [
        { provide: QueryClient, useValue: queryClient },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    const transferState = TestBed.inject(TransferState);
    transferState.set(QUERY_STATE_KEY, dehydrated);

    TestBed.runInInjectionContext(() => hydrateTanStackQuery());

    expect(queryClient.getQueryData(['browser-key'])).toEqual({ value: 2 });
  });

  it('should no-op hydrate on browser when no transfer state', () => {
    const queryClient = new QueryClient();
    TestBed.configureTestingModule({
      providers: [
        { provide: QueryClient, useValue: queryClient },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    expect(() => TestBed.runInInjectionContext(() => hydrateTanStackQuery())).not.toThrow();
  });
});
