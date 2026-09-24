import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button',
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
  },
  template: `
    <button [type]="type()" [disabled]="disabled()" [attr.aria-disabled]="disabled() || null">
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
        border: none;
        border-radius: var(--radius-sm);
        font-size: 1rem;
        font-weight: 500;
        font-family: inherit;
        line-height: 1.2;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.3s ease;
      }

      button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }

      /* --- Size: md (default) --- */
      :host([data-size='md']) button {
        padding: 12px 24px;
      }

      /* --- Size: sm --- */
      :host([data-size='sm']) button {
        padding: 0.4rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        line-height: 1;
        transition: all 0.2s;
      }

      /* --- Variant: primary --- */
      :host([data-variant='primary']) button {
        background: var(--brand-gradient);
        color: white;
      }
      :host([data-variant='primary']) button:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      :host([data-variant='primary'][data-size='sm']) button {
        box-shadow: none;
      }
      :host([data-variant='primary'][data-size='sm']) button:hover:not(:disabled) {
        filter: brightness(1.08);
      }

      /* --- Variant: secondary --- */
      :host([data-variant='secondary']) button {
        background: transparent;
        color: var(--color-accent);
        border: 1px solid var(--color-accent);
      }
      :host([data-variant='secondary']) button:hover:not(:disabled) {
        background: color-mix(in srgb, var(--electric-violet) 10%, transparent);
      }
      :host([data-variant='secondary']) button:disabled {
        border-color: var(--color-border);
        color: var(--color-text-secondary);
      }
      /* --- Variant: danger --- */
      :host([data-variant='danger']) button {
        background: var(--color-error);
        color: white;
      }
      :host([data-variant='danger']) button:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      :host([data-variant='danger'][data-size='sm']) button {
        background: var(--color-error);
        border: 1px solid var(--color-error);
        box-shadow: none;
      }
      :host([data-variant='danger'][data-size='sm']) button:hover:not(:disabled) {
        filter: brightness(1.08);
      }

      /* --- Disabled (all variants) --- */
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ButtonComponent {
  readonly disabled = input(false, { transform: Boolean });
  readonly size = input<'md' | 'sm'>('md');
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<'danger' | 'primary' | 'secondary'>('primary');
}
