import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Post } from '../../services/post.service';
import { PostFormComponent } from './post-form.component';

const submitEvent = (): Event => ({ preventDefault: vi.fn() }) as unknown as Event;

describe('PostFormComponent', () => {
  let component: PostFormComponent;
  let fixture: ComponentFixture<PostFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostFormComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PostFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not emit save when form is invalid', () => {
    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    component.model.set({ title: '', content: '' });
    component.onSubmit(submitEvent());

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should emit save with form values when valid', () => {
    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    component.model.set({ title: 'New title', content: 'New content' });
    component.onSubmit(submitEvent());

    expect(saveSpy).toHaveBeenCalledWith({ title: 'New title', content: 'New content' });
  });

  it('should emit cancel on onCancel()', () => {
    const cancelSpy = vi.fn();
    component.cancel.subscribe(cancelSpy);

    component.onCancel();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should patch form in edit mode when post input is set', async () => {
    const post: Post = {
      id: '1',
      title: 'Existing title',
      content: 'Existing content',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'a1',
        name: 'Author',
        email: 'author@example.com',
        avatarUrl: null,
        role: 'user',
      },
    };

    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.model().title).toBe('Existing title');
    expect(component.model().content).toBe('Existing content');
    expect(component.form().valid()).toBe(true);
  });

  it('should not emit save when submitting is active', async () => {
    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.model.set({ title: 'New title', content: 'New content' });
    component.onSubmit(submitEvent());

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should not emit cancel when submitting is active', async () => {
    const cancelSpy = vi.fn();
    component.cancel.subscribe(cancelSpy);

    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.onCancel();

    expect(cancelSpy).not.toHaveBeenCalled();
  });
});
