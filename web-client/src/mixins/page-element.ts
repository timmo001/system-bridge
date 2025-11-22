import { UIElement } from "./light-dom";

/**
 * Base class for page components.
 * Extends UIElement with page-specific functionality like navigation.
 *
 * @example
 * ```ts
 * @customElement("page-home")
 * export class PageHome extends PageElement {
 *   render() {
 *     return html`
 *       <div>
 *         <h1>Home</h1>
 *         <button @click=${() => this.navigate("/settings")}>Settings</button>
 *       </div>
 *     `;
 *   }
 * }
 * ```
 */
export class PageElement extends UIElement {
  protected displayStyle = "block";

  /**
   * Navigate to a different route using the browser's History API.
   * Triggers a popstate event to notify the router.
   *
   * @param path - The path to navigate to (e.g., "/settings")
   */
  protected navigate(path: string): void {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
