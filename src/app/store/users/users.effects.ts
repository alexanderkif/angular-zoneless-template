import { inject, Injectable } from '@angular/core';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { UserService } from '../../service/user.service';
import { UsersApiActions, UsersUserActions } from './actions';

@Injectable()
export class UsersEffects {
  private actions$ = inject(Actions);
  private userService = inject(UserService);

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersUserActions.getUser),
      exhaustMap(({ id }) =>
        this.userService.getUser(id).pipe(
          map((user) =>
            user
              ? UsersApiActions.getUserSuccess({ user })
              : UsersApiActions.getUserFailure({ errorMsg: 'User not found' })
          ),
          catchError((error: { message: string }) =>
            of(UsersApiActions.getUserFailure({ errorMsg: error.message }))
          )
        )
      )
    )
  );
}
