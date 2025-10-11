import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';
import { PostsEffects } from './posts.effects';
import { PostService } from '../../service/post.service';
import { PostsApiActions, PostsUserActions } from './actions/';
import { hot, cold } from 'jasmine-marbles';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PostsEffects', () => {
  let actions$: Observable<any>;
  let effects: PostsEffects;
  let postService: jasmine.SpyObj<PostService>;

  beforeEach(() => {
    postService = jasmine.createSpyObj('PostService', ['getPosts']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PostsEffects,
        provideMockActions(() => actions$),
        { provide: PostService, useValue: postService },
      ],
    });

    effects = TestBed.inject(PostsEffects);
  });

  it('should dispatch loadPostsSuccess on successful load', () => {
    const posts = [{ id: 1, title: 'A', body: 'B', userId: 1 }];
    const action = PostsUserActions.loadPosts({ limit: 2 });
    const outcome = PostsApiActions.loadPostsSuccess({ posts });

    actions$ = hot('-a', { a: action });
    postService.getPosts.and.returnValue(cold('-b|', { b: posts }));

    const expected = cold('--c', { c: outcome });
    expect(effects.loadPosts$).toBeObservable(expected);
  });

  it('should dispatch loadPostsFailure on error', () => {
    const error = { message: 'fail' };
    const action = PostsUserActions.loadPosts({ limit: 2 });
    const outcome = PostsApiActions.loadPostsFailure({ errorMsg: 'fail' });

    actions$ = hot('-a', { a: action });
    postService.getPosts.and.returnValue(cold('-#|', {}, error));

    const expected = cold('--c', { c: outcome });
    expect(effects.loadPosts$).toBeObservable(expected);
  });
});
