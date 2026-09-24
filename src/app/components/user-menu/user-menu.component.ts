import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { ThemeService } from '../../core/theme/theme.service';
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
  readonly session = inject(SessionService);
  readonly theme = inject(ThemeService);
  private router = inject(Router);

  // Локальное UI-состояние (раньше — глобальный UiStore)
  public readonly showMenu = signal(false);
  public readonly isDark = computed(() => this.theme.resolved() === 'dark');

  public readonly userName = computed(() => this.session.currentUser.value()?.name ?? 'Guest');
  public readonly userAvatar = computed(() => this.session.currentUser.value()?.avatarUrl ?? null);
  public readonly userRole = computed(() => this.session.currentUser.value()?.role ?? 'user');
  public readonly isAuthLoading = computed(() => this.session.currentUser.isLoading());
  public readonly isLoggingOut = computed(() => this.session.logoutState.isPending());
  public readonly GUEST = 'Guest';

  private readonly isProtectedRoute = (url: string): boolean =>
    /^\/(posts|settings)(\/|$)/.test(url);

  closeMenu = () => {
    this.showMenu.set(false);
  };

  toggleMenu = (e: Event) => {
    e.stopPropagation();
    this.showMenu.update((open) => !open);
  };

  toggleTheme = () => {
    this.theme.toggle();
  };

  handleAction = async (action: string): Promise<void> => {
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
        // IMPORTANT: Wait for logout to complete before redirect.
        // The server must delete the refresh token from the database.
        try {
          await this.session.logout();
        } finally {
          const currentUrl = this.router.url;
          this.closeMenu();
          if (this.isProtectedRoute(currentUrl)) {
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: currentUrl },
            });
          }
        }
        break;
    }
  };
}
