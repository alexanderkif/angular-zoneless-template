import { TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { mockUser } from '../types/user';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideZonelessChangeDetection()],
    });
    service = TestBed.inject(UserService);
  });

  it('should retrieve a user', () => {
    service.getUser(1).subscribe((user) => {
      expect(user).toEqual(mockUser);
    });
  });

  it('should return error for non-existing user', () => {
    service.getUser(999).subscribe((user) => {
      expect(user).toBeNull();
    });
  });
});
