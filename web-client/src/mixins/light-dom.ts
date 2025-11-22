import { LitElement } from "lit";

/**
 * Base class for UI components that use Tailwind CSS.
 * Disables Shadow DOM to allow global Tailwind styles to apply.
 *
 * This approach is recommended for applications (not reusable component libraries).
 * See: https://dev.to/43081j/using-tailwind-at-build-time-with-web-components-1bhm
 *
 * @example
 * ```ts
 * @customElement("my-button")
 * export class MyButton extends UIElement {
 *   // Uses default displayStyle: "inline-block"
 *   render() {
 *     return html`<button class="bg-primary">Click me</button>`;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * @customElement("my-input")
 * export class MyInput extends UIElement {
 *   protected displayStyle = "block"; // Override display
 *   render() {
 *     return html`<input class="border rounded" />`;
 *   }
 * }
 * ```
 */
export class UIElement extends LitElement {
  /**
   * Override to set custom display value (default: "inline-block")
   */
  protected displayStyle = "inline-block";

  /**
   * Disables Shadow DOM by returning the element itself.
   * This allows global Tailwind styles to penetrate the component.
   */
  protected createRenderRoot() {
    return this;
  }

  /**
   * Applies the display style directly to the host element.
   */
  connectedCallback() {
    super.connectedCallback();
    this.style.display = this.displayStyle;
  }
}
