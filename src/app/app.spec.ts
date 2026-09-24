import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SessionService } from './core/auth/session.service';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    const sessionMock = {
      currentUser: {
        value: signal(null),
        isLoading: signal(false),
        status: signal('resolved'),
        error: signal<Error | null>(null),
        reload: vi.fn(),
      },
      ensureUser: vi.fn(async () => null),
      reloadCurrentUser: vi.fn(),
      refreshSession: vi.fn(async () => null),
      logoutState: { isPending: signal(false), error: signal<Error | null>(null) },
      logout: vi.fn(async () => undefined),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SessionService, useValue: sessionMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render app-header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
  });

  it('should render main', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main')).toBeTruthy();
  });

  it('should render app-footer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });

  it('should create without lifecycle debug hooks', () => {
    const fixture2 = TestBed.createComponent(App);
    const component2 = fixture2.componentInstance;

    expect(component2).toBeTruthy();
  });
});
