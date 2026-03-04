import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, getApiBaseUrl } from './api-url.token';

describe('api-url.token', () => {
  it('should return dev API URL when environment is dev', () => {
    expect(getApiBaseUrl(true)).toBe('http://localhost:3000/api');
  });

  it('should return relative API URL when environment is not dev', () => {
    expect(getApiBaseUrl(false)).toBe('/api');
  });

  it('should provide API_BASE_URL token', () => {
    TestBed.configureTestingModule({});
    const value = TestBed.inject(API_BASE_URL);
    expect(typeof value).toBe('string');
    expect(value === 'http://localhost:3000/api' || value === '/api').toBe(true);
  });
});
