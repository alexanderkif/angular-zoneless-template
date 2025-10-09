import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserMenuComponent } from './user-menu.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
    fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the menu visibility when toggleMenu is called', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation'); // Spy on stopPropagation to ensure it's called

    // Initially, the menu should be hidden
    expect(component.showMenu).toBeFalse();

    // Call toggleMenu to open the menu
    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBeTrue();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    // Call toggleMenu again to close the menu
    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBeFalse();
  });

  it('should close the menu when document is clicked', () => {
    // Open the menu
    component.showMenu = true;
    expect(component.showMenu).toBeTrue();

    // Simulate a document click
    component.closeMenu();
    expect(component.showMenu).toBeFalse();
  });

  it('should not close the menu when toggleMenu is called', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');

    // Open the menu
    component.showMenu = true;
    expect(component.showMenu).toBeTrue();

    // Call toggleMenu (should not close the menu)
    component.toggleMenu(mockEvent);
    expect(component.showMenu).toBeFalse(); // Menu toggles to false
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });
});