import { Component, HostListener } from '@angular/core';

@Component({
    selector: 'app-user-menu',
    imports: [],
    templateUrl: './user-menu.component.html',
    styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent {
  public showMenu = false;

  @HostListener('document:click') closeMenu() {
    this.showMenu = false;
  }

  toggleMenu(e: Event) {
    e.stopPropagation();
    this.showMenu = !this.showMenu;
  }
}
