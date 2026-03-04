import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiStore } from '../../store/ui/ui.store';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let uiStoreMock: {
    postsLimit: ReturnType<typeof signal<number>>;
    setPostsLimit: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    uiStoreMock = {
      postsLimit: signal(3),
      setPostsLimit: vi.fn((limit: number) => uiStoreMock.postsLimit.set(limit)),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideZonelessChangeDetection(), { provide: UiStore, useValue: uiStoreMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update posts limit via handler', () => {
    const target = { value: '20' } as HTMLSelectElement;

    component.onLimitChange({ target } as unknown as Event);

    expect(uiStoreMock.setPostsLimit).toHaveBeenCalledWith(20);
    expect(uiStoreMock.postsLimit()).toBe(20);
  });

  it('should render current limit in template', () => {
    uiStoreMock.postsLimit.set(10);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('10');
  });
});
