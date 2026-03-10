import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LinkButtonComponent } from '../../components/ui/link-button/link-button.component';

@Component({
  selector: 'app-home',
  imports: [LinkButtonComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
