export interface User {
  id: number;
  name: string;
  email: string;
}

export const mockUser: User = { id: 1, name: 'John Doe', email: 'john.doe@example.com' };

export const GUEST = 'Guest';
