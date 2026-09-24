import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import type { Post } from '../../services/post.service';
import { ButtonComponent } from '../ui/button/button.component';

interface PostFormModel {
  title: string;
  content: string;
}

@Component({
  selector: 'app-post-form',
  imports: [ButtonComponent, FormField],
  templateUrl: './post-form.component.html',
  styleUrl: './post-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostFormComponent {
  // Входные данные: пост для редактирования (если есть)
  post = input<Post | null>(null);
  isSubmitting = input(false);

  // События
  save = output<{ title: string; content: string }>();
  cancel = output<void>();

  // Signal Forms
  readonly model = signal<PostFormModel>({ title: '', content: '' });

  readonly form = form(this.model, (path) => {
    required(path.title, { message: 'Title is required' });
    maxLength(path.title, 200, { message: 'Maximum 200 characters' });
    required(path.content, { message: 'Content is required' });
    maxLength(path.content, 50000, { message: 'Maximum 50000 characters' });
  });

  constructor() {
    // Заполнить форму при редактировании
    effect(() => {
      const postData = this.post();
      if (postData) {
        this.model.set({ title: postData.title, content: postData.content });
      }
    });
  }

  onSubmit = (event: Event) => {
    event.preventDefault();
    if (this.form().valid() && !this.isSubmitting()) {
      const { title, content } = this.model();
      this.save.emit({ title, content });
    }
  };

  onCancel = () => {
    if (this.isSubmitting()) return;
    this.cancel.emit();
  };
}
