import { Component, ChangeDetectionStrategy, signal, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [],
  template: `
    <div class="avatar-wrapper">
      @if (src() && src()!.trim() && !hasError()) {
        <img
          [src]="src()"
          [alt]="alt()"
          [attr.loading]="priority() ? 'eager' : 'lazy'"
          [attr.fetchpriority]="priority() ? 'high' : 'auto'"
          decoding="async"
          (error)="onError()"
        />
      } @else {
        <div class="placeholder">
          {{ getInitial() }}
        </div>
      }
      @if (role() === 'admin') {
        <span class="admin-badge">ADMIN</span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
      }
      .avatar-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
        display: block;
        image-rendering: auto;
      }
      .placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--color-accent);
        color: white;
        font-weight: 600;
      }
      .admin-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        height: 16px;
        padding: 0 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--color-surface);
        border: 2px solid var(--color-accent);
        color: var(--color-accent);
        font-size: 0.55rem;
        font-weight: 700;
        border-radius: 8px;
        letter-spacing: 0.02em;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  src = input<string | null>(null);
  alt = input<string>('');
  size = input<number>(44);
  priority = input<boolean>(false);
  className = input<string>('');
  placeholderClass = input<string>('');
  role = input<'admin' | 'user'>('user');

  hasError = signal(false);

  onError() {
    this.hasError.set(true);
  }

  getInitial(): string {
    if (!this.alt()) return '?';
    return this.alt().charAt(0).toUpperCase();
  }
}
