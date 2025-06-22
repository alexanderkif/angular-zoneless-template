import { Component, DoCheck, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, FooterComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, DoCheck {
  title = 'angular-test-app';

  ngOnInit(): void {
    console.log('AppComponent ngOnInit !');
  }
  ngDoCheck(): void {
    console.log('AppComponent ngDoCheck ===');
  }
}
