import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { AuthQueryService } from './services/auth-query.service';
import { hydrateTanStackQuery } from './ssr-tanstack-hydration';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private authQueryService = inject(AuthQueryService);

  protected readonly title = signal('angular-test-app');
  protected readonly userQuery = injectQuery(() => this.authQueryService.currentUserQueryOptions());
  protected readonly isAuthLoading = this.userQuery.isPending;

  constructor() {
    hydrateTanStackQuery();
  }
}
