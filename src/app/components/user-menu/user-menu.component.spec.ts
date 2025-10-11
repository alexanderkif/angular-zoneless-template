import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserMenuComponent } from './user-menu.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { usersSlice } from '../../store/users/users.reducer.spec';
import { UserState } from '../../store/users/users.reducer';
import { selectUserName } from '../../store/users/users.selector';
import { UsersUserActions } from '../../store/users/actions';

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;
  let store: MockStore<UserState>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideMockStore({ initialState: { usersSlice } }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch');
    store.overrideSelector(selectUserName, 'Test User');

    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the menu visibility when toggleMenu is called', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'login';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    expect(component.showMenu).toBeFalse();

    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBeTrue();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBeFalse();
  });

  it('should not close the menu when toggleMenu is called', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'login';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    component.showMenu = true;
    expect(component.showMenu).toBeTrue();

    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBeFalse();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should close the menu when document is clicked', () => {
    component.showMenu = true;
    expect(component.showMenu).toBeTrue();

    component.closeMenu();
    expect(component.showMenu).toBeFalse();
  });

  it('should dispatch getUser action when login is clicked', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'login';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    component.toggleMenu(mockEvent);

    expect(dispatchSpy).toHaveBeenCalledWith(UsersUserActions.getUser({ id: 1 }));
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should dispatch exitUser action when exit is clicked', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'exit';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    component.toggleMenu(mockEvent);

    expect(dispatchSpy).toHaveBeenCalledWith(UsersUserActions.exitUser());
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should handle settings logic when settings is clicked', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');
    spyOn(console, 'info');

    const mockTarget = document.createElement('button');
    mockTarget.id = 'settings';
    Object.defineProperty(mockEvent, 'target', { value: mockTarget });

    component.toggleMenu(mockEvent);

    expect(console.info).toHaveBeenCalledWith('Handle settings logic');
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should close the menu when document click is triggered', () => {
    // Open the menu
    component.showMenu = true;
    expect(component.showMenu).toBeTrue();

    const event = new Event('click');
    document.dispatchEvent(event);

    component.closeMenu();

    expect(component.showMenu).toBeFalse();
  });
});
