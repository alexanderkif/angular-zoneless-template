import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutComponent } from './about.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
