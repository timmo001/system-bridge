import { UIElement } from "./light-dom";

/**
 * Base class for provider components.
 * Providers use Lit context to share state across the component tree.
 *
 * @example
 * ```ts
 * @customElement("my-provider")
 * export class MyProvider extends ProviderElement {
 *   @provide({ context: myContext })
 *   get state() {
 *     return { value: this._value };
 *   }
 *
 *   render() {
 *     // In Light DOM, content passes through naturally
 *     return html``;
 *   }
 * }
 * ```
 */
export class ProviderElement extends UIElement {
  protected displayStyle = "block";
}
