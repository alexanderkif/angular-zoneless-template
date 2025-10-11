import { Component, HostListener, inject } from '@angular/core';
import { selectUserName } from '../../store/users/users.selector';
import { Store } from '@ngrx/store';
import { UserState } from '../../store/users/users.reducer';
import { GUEST } from '../../types/user';
import { UsersUserActions } from '../../store/users/actions';

@Component({
  selector: 'app-user-menu',
  imports: [],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css',
})
export class UserMenuComponent {
  private userStore = inject(Store<UserState>);
  public showMenu = false;
  public userName = this.userStore.selectSignal(selectUserName);
  public readonly GUEST = GUEST;

  @HostListener('document:click') closeMenu() {
    this.showMenu = false;
  }

  toggleMenu(e: Event) {
    const target = e.target as HTMLElement;
    switch (target.id) {
      case 'login':
        this.userStore.dispatch(UsersUserActions.getUser({ id: 1 }));
        break;
      case 'settings':
        console.info('Handle settings logic');
        break;
      case 'exit':
        this.userStore.dispatch(UsersUserActions.exitUser());
        break;
    }
    e.stopPropagation();
    this.showMenu = !this.showMenu;
  }
}
