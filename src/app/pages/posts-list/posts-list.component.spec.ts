import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostsListComponent } from './posts-list.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PostsUserActions } from '../../store/posts/actions';
import { PostState } from '../../store/posts/posts.reducer';
import { selectPosts, selectIsLoading } from '../../store/posts/posts.reducer';
import { selectPostsLength } from '../../store/posts/posts.selector';
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
        provideMockStore(),
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

  it('should dispatch clearPosts and loadPosts on init', () => {
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.clearPosts());
    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts());
  });

  it('should dispatch loadPosts on loadMore', () => {
    component.loadMore();
    expect(dispatchSpy).toHaveBeenCalledWith(PostsUserActions.loadPosts());
  });
});
