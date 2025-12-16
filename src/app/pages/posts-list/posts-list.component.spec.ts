import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostsListComponent } from './posts-list.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PostsUserActions } from '../../store/posts/actions';
import { PostState } from '../../store/posts/posts.reducer';
import { selectPosts, selectIsLoading } from '../../store/posts/posts.reducer';
import { selectPostsLength } from '../../store/posts/posts.selector';
import { postsSlice } from '../../store/posts/posts.reducer.spec';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PostsListComponent', () => {
  let component: PostsListComponent;
  let fixture: ComponentFixture<PostsListComponent>;
  let store: MockStore<PostState>;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostsListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideMockStore({ initialState: { postsSlice } }),
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');

    store.overrideSelector(selectPosts, []);
    store.overrideSelector(selectIsLoading, false);
    store.overrideSelector(selectPostsLength, 0);

    fixture = TestBed.createComponent(PostsListComponent);
    component = fixture.componentInstance;
    fixture.whenStable();
  });

  afterEach(() => {
    dispatchSpy.mockClear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadPosts with limit 1 on init', () => {
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts({ limit: 1 }));
  });

  it('should dispatch loadPosts with start 1 and limit 2 after 3 seconds', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: any[]
    ): number => {
      if (timeout === 3000) {
        if (typeof handler === 'function') {
          handler(...args);
        }
      }
      return 0;
    }) as typeof setTimeout);

    component.ngOnInit();

    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts({ start: 1, limit: 2 }));

    setTimeoutSpy.mockRestore();
  });

  it('should dispatch loadPosts with start 3 and limit 2 after 5 seconds', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: any[]
    ): number => {
      if (timeout === 5000) {
        if (typeof handler === 'function') {
          handler(...args);
        }
      }
      return 0;
    }) as typeof setTimeout);

    component.ngOnInit();

    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts({ start: 3, limit: 2 }));

    setTimeoutSpy.mockRestore();
  });
});
