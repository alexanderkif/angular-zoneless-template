import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostsStore } from '../../features/posts/posts.store';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  readonly postsStore = inject(PostsStore);

  onLimitChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const limit = parseInt(target.value, 10);
    this.postsStore.setLimit(limit);
  };
}
