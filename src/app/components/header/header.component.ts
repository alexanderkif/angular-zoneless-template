import { Component } from '@angular/core';
import { PanelComponent } from "../panel/panel.component";
import { LogoComponent } from "../logo/logo.component";
import { UserMenuComponent } from "../user-menu/user-menu.component";

@Component({
    selector: 'app-header',
    imports: [PanelComponent, LogoComponent, UserMenuComponent],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css'
})
export class HeaderComponent {

}
