import { mdiPaletteOutline } from "@mdi/js";
import "@timmo001/groundwork-ui/gw-theme-picker.ts";
import type { GwThemePicker } from "@timmo001/groundwork-ui/gw-theme-picker.ts";
import { html } from "lit";
import { customElement, query } from "lit/decorators.js";

import { pageStyles, shared } from "~/components/shared-styles";
import { bindThemePicker } from "~/lib/theme";

import { SbPage } from "./sb-page";

/** The mode and theme, kept in this browser, or one the user brings. */
@customElement("page-settings-appearance")
export class PageSettingsAppearance extends SbPage {
  static override styles = [shared, pageStyles];

  protected readonly pageTitle = "Appearance";

  @query("gw-theme-picker") private picker?: GwThemePicker;

  #unbind?: () => void;

  override firstUpdated(): void {
    if (this.picker !== undefined) this.#unbind = bindThemePicker(this.picker);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unbind?.();
  }

  override render() {
    return html`
      <div class="page">
        ${this.renderHeader({
          heading: "Appearance",
          description:
            "Colours for this browser. Pick a mode and a theme, or import your own: a Groundwork theme or an Omarchy colors.toml.",
          icon: mdiPaletteOutline,
        })}
        <gw-theme-picker layout="inline" gallery></gw-theme-picker>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-appearance": PageSettingsAppearance;
  }
}
