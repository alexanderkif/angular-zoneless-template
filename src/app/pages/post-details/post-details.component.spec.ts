import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostDetailsComponent } from './post-details.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PostService } from '../../service/post.service';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PostDetailsComponent', () => {
  let component: PostDetailsComponent;
  let fixture: ComponentFixture<PostDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostDetailsComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: (key: string) => '1' }),
          },
        },
        {
          provide: PostService,
          useValue: {
            getPost: (id: string) =>
              of({ id: 1, title: 'Test', body: 'Body', userId: 1 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch post details on init', (done) => {
    component.post$.subscribe((post) => {
      expect(post).toEqual({ id: 1, title: 'Test', body: 'Body', userId: 1 });
      done();
    });
  });
});
