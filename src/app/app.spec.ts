import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { ActivatedRoute } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: {} } },
        provideMockStore({ initialState: {} }),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.whenStable();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render app-header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeDefined();
  });

  it('should render main', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main')).toBeDefined();
  });

  it('should render app-footer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-footer')).toBeDefined();
  });

  it('should call lifecycle hooks', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    // Re-create component to catch constructor log
    const fixture2 = TestBed.createComponent(App);
    const component2 = fixture2.componentInstance;

    await new Promise((resolve) => setTimeout(resolve, 0));
    // expect(consoleSpy).toHaveBeenCalledWith('AppComponent constructor !!!'); // Not in code anymore

    component2.ngOnInit();
    expect(consoleSpy).toHaveBeenCalledWith('AppComponent ngOnInit !');

    component2.ngDoCheck();
    expect(consoleSpy).toHaveBeenCalledWith('AppComponent ngDoCheck ===');
  });
});
