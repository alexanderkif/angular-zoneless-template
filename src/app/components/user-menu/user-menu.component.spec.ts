import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserMenuComponent } from './user-menu.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { selectUserName, selectUserAvatar, selectIsLoading } from '../../store/auth/auth.selectors';
import { sessionActions } from '../../store/auth/auth.actions';
import { Router } from '@angular/router';

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;
  let store: MockStore;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;
  let router: { navigate: ReturnType<typeof vi.fn>, url: string };

  beforeEach(async () => {
    router = { navigate: vi.fn(), url: '/current-url' };

    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideMockStore(),
        { provide: Router, useValue: router },
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
    store.overrideSelector(selectUserName, 'Test User');
    store.overrideSelector(selectUserAvatar, 'avatar.png');
    store.overrideSelector(selectIsLoading, false);

    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the menu visibility when toggleMenu is called', () => {
    const mockEvent = new Event('click');
    vi.spyOn(mockEvent, 'stopPropagation');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'some-id';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    expect(component.showMenu).toBe(false);

    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBe(true);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBe(false);
  });

  it('should navigate to login when login is clicked', () => {
    const mockEvent = new Event('click');
    vi.spyOn(mockEvent, 'stopPropagation');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'login';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    component.toggleMenu(mockEvent);

    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/current-url' } });
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should dispatch logout action when exit is clicked', () => {
    const mockEvent = new Event('click');
    vi.spyOn(mockEvent, 'stopPropagation');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'exit';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    component.toggleMenu(mockEvent);

    expect(dispatchSpy).toHaveBeenCalledWith(sessionActions.logout());
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should close the menu when document is clicked', () => {
    component.showMenu = true;
    expect(component.showMenu).toBe(true);

    component.closeMenu();
    expect(component.showMenu).toBe(false);
  });
});
