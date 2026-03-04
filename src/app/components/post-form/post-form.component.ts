import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Post } from '../../services/post.service';

@Component({
  selector: 'app-post-form',
  imports: [ReactiveFormsModule],
  templateUrl: './post-form.component.html',
  styleUrl: './post-form.component.css',
})
export class PostFormComponent {
  // Входные данные: пост для редактирования (если есть)
  post = input<Post | null>(null);
  isSubmitting = input(false);

  // События
  save = output<{ title: string; content: string }>();
  cancel = output<void>();

  // Форма
  form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50000)],
    }),
  });

  constructor() {
    // Заполнить форму при редактировании
    effect(() => {
      const postData = this.post();
      if (postData) {
        this.form.patchValue({
          title: postData.title,
          content: postData.content,
        });
      }
    });

    effect(() => {
      if (this.isSubmitting()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  onSubmit = () => {
    if (this.form.valid && !this.isSubmitting()) {
      // Emit data immediately without tracking submission state
      this.save.emit(this.form.getRawValue());
      // Parent will handle form closure and optimistic updates
    }
  };

  onCancel = () => {
    if (this.isSubmitting()) return;
    this.cancel.emit();
  };
}
