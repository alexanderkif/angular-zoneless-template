import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: {} } },
        { provide: HttpClient, useValue: {} },
        provideMockStore({ initialState: {} }),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
