import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Post } from '../../services/post.service';
import { PostFormComponent } from './post-form.component';

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

    component.form.patchValue({ title: '', content: '' });
    component.onSubmit();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should emit save with form values when valid', () => {
    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    component.form.patchValue({ title: 'New title', content: 'New content' });
    component.onSubmit();

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

    expect(component.form.controls.title.value).toBe('Existing title');
    expect(component.form.controls.content.value).toBe('Existing content');
  });

  it('should not emit save when submitting is active', async () => {
    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.patchValue({ title: 'New title', content: 'New content' });
    component.onSubmit();

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
