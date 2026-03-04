import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let component: AvatarComponent;
  let fixture: ComponentFixture<AvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render placeholder by default', () => {
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.placeholder');
    const img = fixture.nativeElement.querySelector('img');

    expect(placeholder).toBeTruthy();
    expect(img).toBeFalsy();
  });

  it('should render image when src exists and no error', () => {
    fixture.componentRef.setInput('src', 'https://example.com/avatar.png');
    fixture.componentRef.setInput('alt', 'John');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.png');
    expect(img.getAttribute('alt')).toBe('John');
  });

  it('should use eager/high when priority=true', () => {
    fixture.componentRef.setInput('src', 'https://example.com/avatar.png');
    fixture.componentRef.setInput('priority', true);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('should switch to placeholder on image error', () => {
    fixture.componentRef.setInput('src', 'https://example.com/avatar.png');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.placeholder')).toBeTruthy();
  });

  it('should render admin badge for admin role', () => {
    fixture.componentRef.setInput('role', 'admin');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.admin-badge');
    expect(badge).toBeTruthy();
    expect((badge.textContent as string).trim()).toBe('ADMIN');
  });

  it('should not render admin badge for user role', () => {
    fixture.componentRef.setInput('role', 'user');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.admin-badge')).toBeFalsy();
  });

  it('should return ? initial when alt is empty', () => {
    fixture.componentRef.setInput('alt', '');
    fixture.detectChanges();

    expect(component.getInitial()).toBe('?');
  });

  it('should return uppercase first letter of alt', () => {
    fixture.componentRef.setInput('alt', 'john');
    fixture.detectChanges();

    expect(component.getInitial()).toBe('J');
  });

  it('should treat whitespace src as missing', () => {
    fixture.componentRef.setInput('src', '   ');
    fixture.componentRef.setInput('alt', 'Alice');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.placeholder')).toBeTruthy();
  });
});
