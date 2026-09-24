import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostsStore } from '../../features/posts/posts.store';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let postsStoreMock: {
    limit: WritableSignal<number>;
    setLimit: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    postsStoreMock = {
      limit: signal(3),
      setLimit: vi.fn((limit: number) => postsStoreMock.limit.set(limit)),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PostsStore, useValue: postsStoreMock },
      ],
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

    expect(postsStoreMock.setLimit).toHaveBeenCalledWith(20);
    expect(postsStoreMock.limit()).toBe(20);
  });

  it('should render current limit in template', () => {
    postsStoreMock.limit.set(10);
    fixture.detectChanges();

    const info = fixture.nativeElement.querySelector('.settings__limit') as HTMLElement;
    const select = fixture.nativeElement.querySelector('#postsLimit') as HTMLSelectElement;

    expect(info.textContent?.trim()).toBe('10');
    expect(select.value).toBe('10');
  });
});
