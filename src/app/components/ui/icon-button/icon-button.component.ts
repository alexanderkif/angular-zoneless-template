import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-button',
  standalone: true,
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.data-active]': 'active() || null',
  },
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-disabled]="disabled() || null"
      [attr.aria-pressed]="active() ? 'true' : null"
    >
      <ng-content />
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        transition: all 0.2s;
      }

      button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }

      /* --- Size: sm (icon only, square 32px) --- */
      :host([data-size='sm']) button {
        width: 32px;
        height: 32px;
        padding: 6px;
      }

      /* --- Size: md (icon + label, padded) --- */
      :host([data-size='md']) button {
        padding: 0.5rem 0.75rem;
      }

      /* --- Variant: ghost --- */
      :host([data-variant='ghost']:not([data-active])) button:hover:not(:disabled) {
        background-color: rgba(221, 0, 49, 0.05);
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      /* --- Variant: danger (fills with accent on hover, used for destructive icon actions) --- */
      :host([data-variant='danger']) button:hover:not(:disabled) {
        background-color: var(--color-accent);
        border-color: var(--color-accent);
        color: white;
      }

      /* --- Active state (e.g. reaction toggles) --- */
      :host([data-active]) button {
        background-color: var(--color-accent);
        border-color: var(--color-accent);
        color: white;
      }

      :host([data-active]) button:hover:not(:disabled) {
        background-color: var(--color-accent-hover);
        border-color: var(--color-accent-hover);
        color: white;
      }

      /* --- Disabled --- */
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      svg {
        flex-shrink: 0;
      }
    `,
  ],
})
export class IconButtonComponent {
  readonly active = input(false, { transform: Boolean });
  readonly disabled = input(false, { transform: Boolean });
  readonly size = input<'md' | 'sm'>('sm');
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<'danger' | 'ghost'>('ghost');
}
