import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoComponent } from './logo.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('LogoComponent', () => {
  let component: LogoComponent;
  let fixture: ComponentFixture<LogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoComponent],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LogoComponent);
    component = fixture.componentInstance;
    fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
