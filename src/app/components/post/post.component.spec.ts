import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PostComponent } from './post.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PostComponent', () => {
  let component: PostComponent;
  let fixture: ComponentFixture<PostComponent>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PostComponent],
      providers: [provideZonelessChangeDetection(), { provide: Router, useValue: routerSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(PostComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as any;
    fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to the correct post details page', () => {
    const postId = 123;

    component.openDetails(postId);

    expect(router.navigate).toHaveBeenCalledWith([`/posts/${postId}`]);
  });
});
