import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { ActivatedRoute } from '@angular/router';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: {} } },
      ],
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
    const consoleSpy = spyOn(console, 'log');
    
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('AppComponent constructor !!!');
    
    component.ngOnInit();
    expect(consoleSpy).toHaveBeenCalledWith('AppComponent ngOnInit !');

    component.ngDoCheck();
    expect(consoleSpy).toHaveBeenCalledWith('AppComponent ngDoCheck ===');
  });
});
