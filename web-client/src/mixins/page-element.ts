import { html, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";

import { DOCS_URL } from "../lib/links";
import { getResultStyle } from "../lib/result-styles";

import { UIElement } from "./light-dom";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/icon";

interface PageResult {
  success: boolean;
  message: string;
}

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
   * For the home page (title === "System Bridge"), sets the title to just "System Bridge".
   */
  private updateDocumentTitle(): void {
    if (this.title && this.title !== "System Bridge") {
      document.title = `${this.title} | System Bridge`;
    } else {
      document.title = "System Bridge";
    }
  }

  /**
   * Resolves the description template from options or the component's description property.
   */
  private resolveDescription(
    customDescription?: TemplateResult,
  ): TemplateResult {
    if (customDescription) return customDescription;
    if (this.description)
      return html`<p class="text-muted-foreground">${this.description}</p>`;
    return html``;
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
  /**
   * Renders a documentation link styled as an icon, intended for the right side
   * of a page header.
   */
  protected renderDocsLink(): TemplateResult {
    return html`
      <a
        href=${DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Documentation"
        title="Documentation"
        class="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ui-icon name="BookOpen"></ui-icon>
      </a>
    `;
  }

  protected renderPageHeader(options?: {
    showBackButton?: boolean;
    showConnectionIndicator?: boolean;
    customDescription?: TemplateResult;
  }): TemplateResult {
    const {
      showBackButton = true,
      showConnectionIndicator = true,
      customDescription,
    } = options ?? {};
    const description = this.resolveDescription(customDescription);

    return html`
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          ${
            showBackButton
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
              : ""
          }
          <div>
            <h1 class="text-3xl font-bold mb-2">${this.title}</h1>
            ${description}
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${this.renderDocsLink()}
          ${
            showConnectionIndicator
              ? html`<ui-connection-indicator></ui-connection-indicator>`
              : ""
          }
        </div>
      </div>
    `;
  }

  protected renderPageResult(result: PageResult | null): TemplateResult {
    if (!result) return html``;

    const style = getResultStyle(result.success);
    return html`
      <div
        class="rounded-lg border p-4 flex items-start gap-3 ${style.borderClass} ${style.bgClass}"
      >
        <ui-icon name=${style.iconName} class="${style.iconClass}"></ui-icon>
        <div class="flex-1">
          <div class="font-medium ${style.headingClass}">${style.heading}</div>
          <div class="text-sm mt-1 ${style.bodyClass}">${result.message}</div>
        </div>
      </div>
    `;
  }

  /**
   * Renders content gated behind a connection check.
   * Shows a connection-required prompt when disconnected, or the provided content when connected.
   *
   * @param isConnected - Whether the WebSocket is connected
   * @param connectionMessage - Message to show in the connection-required prompt
   * @param onConfigureConnection - Handler for the configure connection button
   * @param content - Content to render when connected
   */
  protected renderWithConnection(
    isConnected: boolean,
    connectionMessage: string,
    onConfigureConnection: () => void,
    content: TemplateResult,
  ): TemplateResult {
    if (!isConnected) {
      return html`
        <ui-connection-required
          message=${connectionMessage}
          @configure-connection=${onConfigureConnection}
        ></ui-connection-required>
      `;
    }
    return content;
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
