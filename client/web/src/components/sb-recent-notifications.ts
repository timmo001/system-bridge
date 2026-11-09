import { AsyncResult } from "effect/reactivity";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { dashboardStyles } from "~/dashboards/shared";
import {
  type FollowedNotification,
  NotificationHappening,
  recentNotifications,
} from "~/lib/atoms";
import { formatDateTime } from "~/lib/format";

/** A clicked button by its label, or its id when it has none. */
const buttonLabel = (
  notification: FollowedNotification,
  action: string,
): string =>
  notification.buttons.find((button) => button.id === action)?.label ?? action;

const describe = (
  notification: FollowedNotification,
  happened: NotificationHappening,
): string =>
  NotificationHappening.$match(happened, {
    Sent: () => "sent",
    Clicked: ({ action }) =>
      action === "default"
        ? "clicked the notification"
        : `clicked ${buttonLabel(notification, action)}`,
    Closed: ({ reason }) => `closed (${reason})`,
  });

const describeAll = (notification: FollowedNotification): string => {
  const text = notification.happened
    .map((happened) => describe(notification, happened))
    .join(", ");

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

/** The notifications System Bridge sent while the page was open, and what happened to each. */
@customElement("sb-recent-notifications")
export class SbRecentNotifications extends LitElement {
  static override styles = [
    shared,
    dashboardStyles,
    css`
      .list > li {
        align-items: flex-start;
      }

      .details {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-1);
        min-width: 0;
      }
    `,
  ];

  readonly #notifications = new AtomController(this, () => recentNotifications);

  override render() {
    const notifications = AsyncResult.getOrElse(
      this.#notifications.value,
      () => [],
    );

    if (notifications.length === 0) {
      return html`<p class="muted small">
        None yet. Notifications sent from here, Home Assistant or anywhere else
        show here once sent, with what happens to them.
      </p>`;
    }

    const items = notifications.map(
      (notification) =>
        html`<li>
          <div class="details spacer">
            <strong class="break">${notification.title}</strong>
            <span class="small break">${notification.message}</span>
            <span class="muted xsmall"> ${describeAll(notification)} </span>
          </div>
          <span class="muted xsmall">
            ${formatDateTime(notification.updated)}
          </span>
        </li>`,
    );

    return html`<ul class="list">
      ${items}
    </ul>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-recent-notifications": SbRecentNotifications;
  }
}
