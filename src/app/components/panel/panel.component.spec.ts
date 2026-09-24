import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { PanelComponent } from './panel.component';

const createSessionMock = () => {
  const currentUserValue = signal<{ id: string } | null>(null);

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

describe('PanelComponent', () => {
  let component: PanelComponent;
  let fixture: ComponentFixture<PanelComponent>;
  let sessionMock: ReturnType<typeof createSessionMock>;

  beforeEach(async () => {
    sessionMock = createSessionMock();

    await TestBed.configureTestingModule({
      imports: [PanelComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SessionService, useValue: sessionMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute isAuthenticated=false when no user', () => {
    expect(component.isAuthenticated()).toBe(false);
  });

  it('should compute isAuthenticated=true when user exists', () => {
    sessionMock.currentUser.value.set({ id: 'u1' });

    expect(component.isAuthenticated()).toBe(true);
  });
});
