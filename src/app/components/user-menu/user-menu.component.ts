import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthQueryService } from '../../services/auth-query.service';
import { UiStore } from '../../store/ui/ui.store';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-user-menu',
  imports: [AvatarComponent],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeMenu()',
  },
})
export class UserMenuComponent {
  private authQueryService = inject(AuthQueryService);
  private router = inject(Router);
  private uiStore = inject(UiStore);

  public readonly userQuery = injectQuery(() => this.authQueryService.currentUserQueryOptions());
  public readonly logoutMutation = this.authQueryService.logoutMutation();

  public readonly showMenu = this.uiStore.isUserMenuOpen;
  public readonly userName = computed(() => this.userQuery.data()?.name ?? 'Guest');
  public readonly userAvatar = computed(() => this.userQuery.data()?.avatarUrl ?? null);
  public readonly userRole = computed(() => this.userQuery.data()?.role ?? 'user');
  public readonly isAuthLoading = computed(() => this.userQuery.isPending());
  public readonly isLoggingOut = computed(() => this.logoutMutation.isPending());
  public readonly GUEST = 'Guest';

  private readonly isProtectedRoute = (url: string): boolean =>
    /^\/(posts|settings)(\/|$)/.test(url);

  closeMenu = () => {
    this.uiStore.closeUserMenu();
  };

  toggleMenu = (e: Event) => {
    e.stopPropagation();
    this.uiStore.toggleUserMenu();
  };

  handleAction = (action: string) => {
    switch (action) {
      case 'login':
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.router.url },
        });
        this.closeMenu();
        break;
      case 'settings':
        this.router.navigate(['/settings']);
        this.closeMenu();
        break;
      case 'exit':
        // IMPORTANT: Wait for logout to complete before redirect
        // This ensures the server deletes the refresh token from the database
        // Don't close menu immediately - user can see "Logging out..." feedback
        this.logoutMutation.mutate(undefined, {
          onSettled: () => {
            const currentUrl = this.router.url;
            this.closeMenu();
            if (this.isProtectedRoute(currentUrl)) {
              this.router.navigate(['/login'], {
                queryParams: { returnUrl: currentUrl },
              });
            }
          },
        });
        break;
    }
  };
}
