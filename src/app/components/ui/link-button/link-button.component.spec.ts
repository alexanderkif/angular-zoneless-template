import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LinkButtonComponent } from './link-button.component';

describe('LinkButtonComponent', () => {
  let component: LinkButtonComponent;
  let fixture: ComponentFixture<LinkButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkButtonComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkButtonComponent);
    fixture.componentRef.setInput('routerLink', '/');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.size()).toBe('md');
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

  it('should render an anchor element', () => {
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor).not.toBeNull();
  });

  it('should set routerLink on anchor', async () => {
    fixture.componentRef.setInput('routerLink', '/posts');
    await fixture.whenStable();
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor.getAttribute('href')).toBe('/posts');
  });

  it('should accept array routerLink', async () => {
    fixture.componentRef.setInput('routerLink', ['/posts', '1']);
    await fixture.whenStable();
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor.getAttribute('href')).toBe('/posts/1');
  });

  it('should set secondary variant on host attribute', async () => {
    fixture.componentRef.setInput('variant', 'secondary');
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('data-variant')).toBe('secondary');
  });

  it('should set md size on host attribute by default', () => {
    expect(fixture.nativeElement.getAttribute('data-size')).toBe('md');
  });
});
