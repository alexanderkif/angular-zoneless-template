import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { PostsEffects } from './posts.effects';
import { PostService } from '../../services/post.service';
import { PostsApiActions, PostsUserActions } from './actions/';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';

describe('PostsEffects', () => {
  let actions$: Observable<any>;
  let effects: PostsEffects;
  let postService: { getPosts: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    postService = { getPosts: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PostsEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: PostService, useValue: postService },
      ],
    });

    effects = TestBed.inject(PostsEffects);
  });

  it('should dispatch loadPostsSuccess on successful load', async () => {
    const posts = [{ id: 1, title: 'A', body: 'B', userId: 1 }];
    const action = PostsUserActions.loadPosts({ limit: 2 });

    actions$ = of(action);
    postService.getPosts.mockReturnValue(of(posts));

    const result = await firstValueFrom(effects.loadPosts$);
    expect(result).toEqual(PostsApiActions.loadPostsSuccess({ posts }));
  });

  it('should dispatch loadPostsFailure on error', async () => {
    const error = { message: 'fail' };
    const action = PostsUserActions.loadPosts({ limit: 2 });

    actions$ = of(action);
    postService.getPosts.mockReturnValue(throwError(() => error));

    const result = await firstValueFrom(effects.loadPosts$);
    expect(result).toEqual(PostsApiActions.loadPostsFailure({ errorMsg: 'fail' }));
  });
});
