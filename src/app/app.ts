import { afterNextRender, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('angular-test-app');

  constructor() {
    afterNextRender(() => console.log('AppComponent constructor !!!'));
  }

  ngOnInit(): void {
    console.log('AppComponent ngOnInit !');
  }
  ngDoCheck(): void {
    console.log('AppComponent ngDoCheck ===');
  }
}
