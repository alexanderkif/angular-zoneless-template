import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-link-button',
  standalone: true,
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
  },
  template: `
    <a [routerLink]="routerLink()">
      <ng-content />
    </a>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        font-family: inherit;
        line-height: 1.2;
        cursor: pointer;
        text-decoration: none;
      }

      a:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }

      /* --- Size: md (default) --- */
      :host([data-size='md']) a {
        padding: 12px 24px;
      }

      /* --- Size: sm --- */
      :host([data-size='sm']) a {
        padding: 0.4rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        line-height: 1;
      }

      /* --- Variant: primary --- */
      :host([data-variant='primary']) a {
        background: var(--color-accent);
        color: white;
      }
      :host([data-variant='primary']) a:hover {
        background: var(--color-accent-hover);
      }

      /* --- Variant: secondary --- */
      :host([data-variant='secondary']) a {
        background: transparent;
        color: var(--color-accent);
        border: 1px solid var(--color-accent);
      }
      :host([data-variant='secondary']) a:hover {
        background: rgba(221, 0, 49, 0.08);
      }
    `,
  ],
})
export class LinkButtonComponent {
  readonly routerLink = input.required<string | unknown[]>();
  readonly size = input<'md' | 'sm'>('md');
  readonly variant = input<'primary' | 'secondary'>('primary');
}
