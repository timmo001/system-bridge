import { LitElement } from "lit";

/**
 * Base class for UI components that use Tailwind CSS.
 * Disables Shadow DOM to allow global Tailwind styles to apply.
 *
 * This approach is recommended for applications (not reusable component libraries).
 * See: https://dev.to/43081j/using-tailwind-at-build-time-with-web-components-1bhm
 *
 * Display styles are now handled via Tailwind's @layer base in globals.css
 * instead of inline styles for better CSS practices.
 *
 * @example
 * ```ts
 * @customElement("my-button")
 * export class MyButton extends UIElement {
 *   render() {
 *     return html`<button class="bg-primary">Click me</button>`;
 *   }
 * }
 * ```
 */
export class UIElement extends LitElement {
  /**
   * Disables Shadow DOM by returning the element itself.
   * This allows global Tailwind styles to penetrate the component.
   */
  protected createRenderRoot() {
    return this;
  }
}
