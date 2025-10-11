import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { mockUser, User } from '../types/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  getUser(id: number): Observable<User | null> {
    return id === 1 ? of(mockUser) : of(null);
  }
}
