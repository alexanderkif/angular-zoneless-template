import { HttpEvent, HttpEventType, HttpRequest, HttpResponse } from '@angular/common/http';
import { loggingInterceptor } from './loggingInterceptor';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

describe('loggingInterceptor', () => {
  it('should log response with status code', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const mockRequest = new HttpRequest('GET', '/api/test');
    const mockResponse = new HttpResponse({ status: 200, body: { data: 'test' } });
    
    const next = vi.fn(() => of(mockResponse));
    
    const result$ = loggingInterceptor(mockRequest, next);
    const result = await firstValueFrom(result$);
    
    expect(result).toEqual(mockResponse);
    expect(consoleSpy).toHaveBeenCalledWith('/api/test', 'returned a response with status', 200);
    
    consoleSpy.mockRestore();
  });

  it('should not log non-response events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const mockRequest = new HttpRequest('GET', '/api/test');
    const mockSentEvent: HttpEvent<unknown> = { type: HttpEventType.Sent };
    
    const next = vi.fn(() => of(mockSentEvent));
    
    const result$ = loggingInterceptor(mockRequest, next);
    await firstValueFrom(result$);
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should pass request through next handler', async () => {
    const mockRequest = new HttpRequest('POST', '/api/data', { test: 'data' });
    const mockResponse = new HttpResponse({ status: 201 });
    
    const next = vi.fn(() => of(mockResponse));
    
    const result$ = loggingInterceptor(mockRequest, next);
    await firstValueFrom(result$);
    
    expect(next).toHaveBeenCalledWith(mockRequest);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should handle different HTTP methods and status codes', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const testCases = [
      { method: 'POST', url: '/api/create', status: 201 },
      { method: 'PUT', url: '/api/update', status: 200 },
      { method: 'DELETE', url: '/api/delete', status: 204 },
      { method: 'PATCH', url: '/api/patch', status: 200 },
    ];

    for (const testCase of testCases) {
      consoleSpy.mockClear();
      
      const mockRequest = new HttpRequest(testCase.method as any, testCase.url);
      const mockResponse = new HttpResponse({ status: testCase.status });
      
      const next = vi.fn(() => of(mockResponse));
      
      const result$ = loggingInterceptor(mockRequest, next);
      await firstValueFrom(result$);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        testCase.url,
        'returned a response with status',
        testCase.status
      );
    }
    
    consoleSpy.mockRestore();
  });
});
