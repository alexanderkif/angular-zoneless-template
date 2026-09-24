import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { HeaderComponent } from './header.component';

type MockUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
};

const createSessionMock = () => {
  const currentUserValue = signal<MockUser | null>(null);

  return {
    currentUser: {
      value: currentUserValue,
      isLoading: signal(false),
      status: signal('resolved'),
      error: signal<Error | null>(null),
      reload: vi.fn(),
    },
    ensureUser: vi.fn(async () => currentUserValue()),
    reloadCurrentUser: vi.fn(),
    refreshSession: vi.fn(async () => currentUserValue()),
    logoutState: { isPending: signal(false), error: signal<Error | null>(null) },
    logout: vi.fn(async () => {
      currentUserValue.set(null);
    }),
  };
};

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SessionService, useValue: createSessionMock() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render logo, panel and user-menu', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-logo')).toBeTruthy();
    expect(compiled.querySelector('app-panel')).toBeTruthy();
    expect(compiled.querySelector('app-user-menu')).toBeTruthy();
  });
});
