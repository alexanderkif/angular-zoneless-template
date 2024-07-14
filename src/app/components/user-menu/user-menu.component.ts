import { Component } from '@angular/core';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent {
  public showMenu = false;

  toggleMenu() {
    this.showMenu = !this.showMenu;
    console.log('showMenu', this.showMenu);
    
  }
}
