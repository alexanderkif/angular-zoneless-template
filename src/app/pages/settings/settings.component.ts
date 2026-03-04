import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiStore } from '../../store/ui/ui.store';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  readonly uiStore = inject(UiStore);

  onLimitChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const limit = parseInt(target.value, 10);
    this.uiStore.setPostsLimit(limit);
  };
}
