import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-panel',
  imports: [RouterModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {
  private store = inject(Store);
  public isAuthenticated = this.store.selectSignal(selectIsAuthenticated);
}
