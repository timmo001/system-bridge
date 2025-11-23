import { html, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";

import { UIElement } from "./light-dom";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/icon";

/**
 * Base class for page components.
 * Extends UIElement with page-specific functionality like navigation.
 *
 * @example
 * ```ts
 * @customElement("page-home")
 * export class PageHome extends PageElement {
 *   title = "Home";
 *   description = "Welcome to the home page";
 *
 *   render() {
 *     return html`
 *       <div>
 *         ${this.renderPageHeader()}
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
   * Page title. This will be used in the page heading and formatted as "title | System Bridge" for document.title.
   * Subclasses should override this property with their specific title (without the pipe).
   */
  @property()
  title = "System Bridge";

  /**
   * Page description. This will be displayed below the title in the page header.
   * Subclasses should override this property with their specific description.
   */
  @property()
  description = "";

  connectedCallback(): void {
    super.connectedCallback();
    this.updateDocumentTitle();
  }

  updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated?.(changedProperties);
    if (changedProperties.has("title")) {
      this.updateDocumentTitle();
    }
  }

  /**
   * Updates the document title with the page title in the format "title | System Bridge".
   */
  private updateDocumentTitle(): void {
    if (this.title && this.title !== "System Bridge") {
      document.title = `${this.title} | System Bridge`;
    }
  }

  /**
   * Renders the page header with title, description, back button, and connection indicator.
   * Pages can override this method or customize it by overriding the description property.
   *
   * @param options - Optional configuration for the header
   * @param options.showBackButton - Whether to show the back button (default: true)
   * @param options.showConnectionIndicator - Whether to show the connection indicator (default: true)
   * @param options.customDescription - Custom description template to override the default description
   * @returns Template result for the page header
   */
  protected renderPageHeader(options?: {
    showBackButton?: boolean;
    showConnectionIndicator?: boolean;
    customDescription?: TemplateResult;
  }): TemplateResult {
    const showBackButton = options?.showBackButton ?? true;
    const showConnectionIndicator = options?.showConnectionIndicator ?? true;
    const description =
      options?.customDescription ??
      (this.description
        ? html`<p class="text-muted-foreground">${this.description}</p>`
        : html``);

    return html`
      <div
        class="flex items-center ${showConnectionIndicator
          ? "justify-between"
          : "gap-3"}"
      >
        <div class="flex items-center gap-3">
          ${showBackButton
            ? html`
                <ui-button
                  variant="ghost"
                  size="icon"
                  @click=${this.handleNavigateToHome}
                  aria-label="Back to home"
                >
                  <ui-icon name="ArrowLeft"></ui-icon>
                </ui-button>
              `
            : ""}
          <div>
            <h1 class="text-3xl font-bold mb-2">${this.title}</h1>
            ${description}
          </div>
        </div>
        ${showConnectionIndicator
          ? html`<ui-connection-indicator></ui-connection-indicator>`
          : ""}
      </div>
    `;
  }

  /**
   * Default handler for navigating to home. Can be overridden by subclasses.
   */
  protected handleNavigateToHome = (): void => {
    this.navigate("/");
  };

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
