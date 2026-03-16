import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiStore } from './ui.store';

describe('UiStore', () => {
  let store: InstanceType<typeof UiStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    store = TestBed.inject(UiStore);
  });

  it('should initialize with default state', () => {
    expect(store.isUserMenuOpen()).toBe(false);
    expect(store.postsPage()).toBe(1);
    expect(store.postsLimit()).toBe(3);
  });

  it('should open/close/toggle user menu', () => {
    store.openUserMenu();
    expect(store.isUserMenuOpen()).toBe(true);

    store.closeUserMenu();
    expect(store.isUserMenuOpen()).toBe(false);

    store.toggleUserMenu();
    expect(store.isUserMenuOpen()).toBe(true);

    store.toggleUserMenu();
    expect(store.isUserMenuOpen()).toBe(false);
  });

  it('should handle pagination updates', () => {
    store.setPostsPage(5);
    expect(store.postsPage()).toBe(5);

    store.nextPostsPage();
    expect(store.postsPage()).toBe(6);

    store.prevPostsPage();
    expect(store.postsPage()).toBe(5);
  });

  it('should not go below page 1', () => {
    store.setPostsPage(1);
    store.prevPostsPage();
    expect(store.postsPage()).toBe(1);
  });

  it('should set posts limit and reset page to 1', () => {
    store.setPostsPage(4);
    expect(store.postsPage()).toBe(4);

    store.setPostsLimit(20);
    expect(store.postsLimit()).toBe(20);
    expect(store.postsPage()).toBe(1);
  });

  it('hasPrevPage should reflect whether current page is > 1', () => {
    expect(store.hasPrevPage()).toBe(false);

    store.setPostsPage(2);
    expect(store.hasPrevPage()).toBe(true);

    store.prevPostsPage();
    expect(store.postsPage()).toBe(1);
    expect(store.hasPrevPage()).toBe(false);
  });
});
