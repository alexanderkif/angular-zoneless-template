import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthQueryService } from '../../services/auth-query.service';

@Component({
  selector: 'app-panel',
  imports: [RouterModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {
  private authQueryService = inject(AuthQueryService);
  public readonly userQuery = injectQuery(this.authQueryService.currentUserQueryOptions);
  public readonly isAuthenticated = computed(() => !!this.userQuery.data());
}
