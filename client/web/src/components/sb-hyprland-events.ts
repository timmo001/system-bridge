import { AsyncResult } from "effect/reactivity";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { dashboardStyles } from "~/dashboards/shared";
import { hyprlandEvents } from "~/lib/atoms";
import { formatDateTime } from "~/lib/format";

/** The latest custom events Hyprland sent while the page was open. */
@customElement("sb-hyprland-events")
export class SbHyprlandEvents extends LitElement {
  static override styles = [shared, dashboardStyles];

  readonly #events = new AtomController(this, () => hyprlandEvents);

  override render() {
    const events = AsyncResult.getOrElse(this.#events.value, () => []);

    if (events.length === 0) {
      return html`<p class="muted small">
        None yet. A bind to Hyprland's event dispatcher, such as
        <span class="mono">hl.dsp.event("dock")</span>, sends one.
      </p>`;
    }

    const items = events.map(
      (event) =>
        html`<li>
          <span class="spacer mono">${event.data}</span>
          <span class="muted xsmall">${formatDateTime(event.received)}</span>
        </li>`,
    );

    return html`<ul class="list">
      ${items}
    </ul>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-hyprland-events": SbHyprlandEvents;
  }
}
