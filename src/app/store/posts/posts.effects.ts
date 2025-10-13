import { inject, Injectable } from '@angular/core';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PostService } from '../../service/post.service';
import { PostsApiActions, PostsUserActions } from './actions/';

@Injectable()
export class PostsEffects {
  private actions$ = inject(Actions);
  private postService = inject(PostService);

  loadPosts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostsUserActions.loadPosts),
      exhaustMap((payload) =>
        this.postService.getPosts(payload.start, payload.limit).pipe(
          map((posts) => PostsApiActions.loadPostsSuccess({ posts })),
          catchError((error: { message: string }) =>
            of(PostsApiActions.loadPostsFailure({ errorMsg: error.message }))
          )
        )
      )
    )
  );
}
