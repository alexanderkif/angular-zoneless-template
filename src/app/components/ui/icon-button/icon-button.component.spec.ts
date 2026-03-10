import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconButtonComponent } from './icon-button.component';

describe('IconButtonComponent', () => {
  let component: IconButtonComponent;
  let fixture: ComponentFixture<IconButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconButtonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(IconButtonComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.active()).toBe(false);
    expect(component.disabled()).toBe(false);
    expect(component.size()).toBe('sm');
    expect(component.type()).toBe('button');
    expect(component.variant()).toBe('ghost');
  });

  it('should reflect active input on host attribute', async () => {
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-active')).not.toBeNull();
  });

  it('should not set data-active when inactive', async () => {
    fixture.componentRef.setInput('active', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-active')).toBeNull();
  });

  it('should reflect variant on host attribute', async () => {
    fixture.componentRef.setInput('variant', 'danger');
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-variant')).toBe('danger');
  });

  it('should reflect size on host attribute', async () => {
    fixture.componentRef.setInput('size', 'md');
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-size')).toBe('md');
  });

  it('should disable button when disabled input is true', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('should set aria-pressed when active', async () => {
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('should not set aria-pressed when inactive', async () => {
    fixture.componentRef.setInput('active', false);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-pressed')).toBeNull();
  });

  it('should set button type', async () => {
    fixture.componentRef.setInput('type', 'submit');
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.type).toBe('submit');
  });

  it('should transform string "true" to boolean true for active input', () => {
    fixture.componentRef.setInput('active', 'true' as any);
    expect(component.active()).toBe(true);
  });

  it('should transform string "false" to boolean false for active input', () => {
    fixture.componentRef.setInput('active', '' as any);
    expect(component.active()).toBe(false);
  });
});
