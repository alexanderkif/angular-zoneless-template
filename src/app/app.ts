import { afterNextRender, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { selectIsLoading } from './store/auth/auth.selectors';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private store = inject(Store);
  
  protected readonly title = signal('angular-test-app');
  protected readonly isAuthLoading = this.store.selectSignal(selectIsLoading);

  constructor() {
    afterNextRender(() => console.log('AppComponent constructor afterNextRender !!!'));
  }

  ngOnInit(): void {
    console.log('AppComponent ngOnInit !');
  }
  
  ngDoCheck(): void {
    console.log('AppComponent ngDoCheck ===');
  }
}
