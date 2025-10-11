import { createSelector } from '@ngrx/store';
import { selectUser } from './users.reducer';
import { GUEST } from '../../types/user';

export const selectUserName = createSelector(selectUser, (user) => user?.name || GUEST);
