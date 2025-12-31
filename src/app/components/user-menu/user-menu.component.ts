import { Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { sessionActions } from '../../store/auth/auth.actions';
import { selectUserName, selectUserAvatar, selectIsLoading } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-user-menu',
  imports: [NgOptimizedImage],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css',
  host: {
    '(document:click)': 'closeMenu()',
  },
})
export class UserMenuComponent {
  private store = inject(Store);
  private router = inject(Router);
  public showMenu = false;
  public userName = this.store.selectSignal(selectUserName);
  public userAvatar = this.store.selectSignal(selectUserAvatar);
  public isAuthLoading = this.store.selectSignal(selectIsLoading);
  public readonly GUEST = 'Guest';

  closeMenu() {
    this.showMenu = false;
  }

  toggleMenu(e: Event) {
    const target = e.target as HTMLElement;
    switch (target.id) {
      case 'login':
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.router.url },
        });
        break;
      case 'settings':
        // TODO: Implement settings
        break;
      case 'exit':
        this.store.dispatch(sessionActions.logout());
        break;
    }
    e.stopPropagation();
    this.showMenu = !this.showMenu;
  }
}
