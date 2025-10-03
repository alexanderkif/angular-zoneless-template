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
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostsListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideMockStore({ initialState: { postsSlice } }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch');

    store.overrideSelector(selectPosts, []);
    store.overrideSelector(selectIsLoading, false);
    store.overrideSelector(selectPostsLength, 0);

    fixture = TestBed.createComponent(PostsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    dispatchSpy.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadPosts with limit 1 on init', () => {
    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts({ limit: 1 }));
  });

  it('should dispatch loadPosts with limit 3 after 3 seconds', (done) => {
    const setTimeoutSpy = spyOn(window, 'setTimeout').and.callFake(((
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

    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts({ limit: 3 }));

    setTimeoutSpy.and.callThrough();
    done();
  });

  it('should dispatch loadPosts with limit 5 after 5 seconds', () => {
    const setTimeoutSpy = spyOn(window, 'setTimeout').and.callFake(((
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

    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts({ limit: 5 }));

    setTimeoutSpy.and.callThrough();
  });
});
