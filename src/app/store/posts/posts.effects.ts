import { inject, Injectable } from '@angular/core';
import { catchError, concatMap, map, of, withLatestFrom } from 'rxjs';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PostService } from '../../services/post.service';
import { PostsApiActions, PostsUserActions } from './actions/';
import { Store } from '@ngrx/store';
import { selectLimit, selectOffset } from './posts.reducer';

@Injectable()
export class PostsEffects {
  private actions$ = inject(Actions);
  private postService = inject(PostService);
  private store = inject(Store);

  loadPosts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostsUserActions.loadPosts),
      withLatestFrom(this.store.select(selectOffset), this.store.select(selectLimit)),
      concatMap(([_, offset, limit]) =>
        this.postService.getPosts(offset, limit).pipe(
          map((posts) => PostsApiActions.loadPostsSuccess({ posts })),
          catchError((error: { message: string }) =>
            of(PostsApiActions.loadPostsFailure({ errorMsg: error.message }))
          )
        )
      )
    )
  );
}
