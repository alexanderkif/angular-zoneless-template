import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.disabled()).toBe(false);
    expect(component.size()).toBe('md');
    expect(component.type()).toBe('button');
    expect(component.variant()).toBe('primary');
  });

  it('should reflect variant on host attribute', async () => {
    fixture.componentRef.setInput('variant', 'secondary');
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-variant')).toBe('secondary');
  });

  it('should reflect size on host attribute', async () => {
    fixture.componentRef.setInput('size', 'sm');
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-size')).toBe('sm');
  });

  it('should disable button when disabled input is true', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('should set aria-disabled when disabled', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('should not set aria-disabled when enabled', async () => {
    fixture.componentRef.setInput('disabled', false);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-disabled')).toBeNull();
  });

  it('should set button type', async () => {
    fixture.componentRef.setInput('type', 'submit');
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.type).toBe('submit');
  });

  it('should set danger variant on host attribute', async () => {
    fixture.componentRef.setInput('variant', 'danger');
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-variant')).toBe('danger');
  });

  it('should transform string to boolean for disabled input', () => {
    fixture.componentRef.setInput('disabled', 'true' as any);
    expect(component.disabled()).toBe(true);
  });

  it('should transform empty string to false for disabled input', () => {
    fixture.componentRef.setInput('disabled', '' as any);
    expect(component.disabled()).toBe(false);
  });
});
