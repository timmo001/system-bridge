import {
  mdiAlertCircleOutline,
  mdiCheckCircle,
  mdiCircleOutline,
  mdiContentCopy,
  mdiCogOutline,
  mdiOpenInNew,
  mdiProgressClock,
} from "@mdi/js";
import type { DiscordSetup } from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-button.ts";
import "@timmo001/groundwork-ui/gw-card.ts";
import { icon } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  discordSetup,
  registry,
  updateDiscordSetup,
} from "~/lib/atoms";

import { SbPage } from "./sb-page";

const PORTAL_URL = "https://discord.com/developers/applications";

type StepState = "done" | "waiting" | "failed" | "todo";

const stepIcons: Readonly<Record<StepState, string>> = {
  done: mdiCheckCircle,
  waiting: mdiProgressClock,
  failed: mdiAlertCircleOutline,
  todo: mdiCircleOutline,
};

const stepLabels: Readonly<Record<StepState, string>> = {
  done: "Done",
  waiting: "Waiting",
  failed: "Failed",
  todo: "Not yet",
};

/** The backend's messages are Go errors, which start in lower case. */
const sentence = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

interface Step {
  readonly label: string;
  readonly detail: string;
  readonly state: StepState;
}

/** Each stage of the connection, from saved credentials to signed in. */
const steps = (setup: DiscordSetup): readonly Step[] => [
  {
    label: "Application saved",
    detail: setup.configured
      ? `Client ID ${setup.clientId}`
      : "Enter your Discord application below.",
    state: setup.configured ? "done" : "todo",
  },
  {
    label: "Discord running",
    detail: setup.running
      ? "The Discord desktop app is open on this system."
      : "Open the Discord desktop app on this system.",
    state: setup.running ? "done" : "todo",
  },
  {
    label: "Connected",
    detail: setup.connected
      ? "System Bridge is talking to Discord."
      : setup.error !== "" && setup.configured
        ? "Discord refused the connection. Check the client ID and secret."
        : setup.configured && setup.running
          ? "Connecting to Discord…"
          : "Connects once the steps above are done.",
    state: setup.connected
      ? "done"
      : setup.error !== "" && setup.configured
        ? "failed"
        : setup.configured && setup.running
          ? "waiting"
          : "todo",
  },
  {
    label: "Signed in",
    detail: setup.authenticated
      ? "Allowed to read and change your voice settings."
      : setup.connected
        ? "Approve the prompt in Discord with the account that owns the application."
        : "Discord asks you to approve System Bridge once it's connected.",
    state: setup.authenticated ? "done" : setup.connected ? "waiting" : "todo",
  },
];

const placeholder = html`<gw-skeleton
  style="min-height: 34rem; border-radius: var(--gw-radius-l)"
></gw-skeleton>`;

/** Connects System Bridge to the Discord desktop app. */
@customElement("page-settings-discord")
export class PageSettingsDiscord extends SbPage {
  static override styles = [
    ...SbPage.styles,
    css`
      .steps {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-3);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .step {
        display: flex;
        align-items: flex-start;
        gap: var(--gw-space-3);
      }

      .step > .icon {
        flex-shrink: 0;
        color: var(--gw-color-text-secondary);
      }

      .step[data-state="done"] > .icon {
        color: var(--gw-color-success);
      }

      .step[data-state="waiting"] > .icon {
        color: var(--gw-color-warning);
      }

      .step[data-state="failed"] > .icon {
        color: var(--gw-color-danger);
      }

      .guide {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-3);
        margin: 0;
        padding-inline-start: var(--gw-space-5);
      }

      .guide li::marker {
        color: var(--gw-color-text-secondary);
      }

      .copy {
        display: inline-flex;
        align-items: center;
        gap: var(--gw-space-2);
      }
    `,
  ];

  readonly #setup = new AtomController(this, () => discordSetup);

  readonly #update = new AtomController(this, () => updateDiscordSetup);

  @state() private clientId: string | null = null;

  @state() private clientSecret = "";

  @state() private copied = false;

  protected readonly pageTitle = "Discord setup";

  #onClientIdInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      this.clientId = event.target.value;
    }
  };

  #onSecretInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      this.clientSecret = event.target.value;
    }
  };

  #copyRedirect = async (event: MouseEvent) => {
    const value =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.dataset.value
        : undefined;

    if (value === undefined) return;

    await navigator.clipboard.writeText(value);
    this.copied = true;
  };

  /** Reads the fields, which start with the saved client ID. */
  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (!(event.currentTarget instanceof HTMLFormElement)) return;

    const field = event.currentTarget.elements.namedItem("clientId");

    registry.set(updateDiscordSetup, {
      clientId: field instanceof HTMLInputElement ? field.value.trim() : "",
      clientSecret: this.clientSecret.trim(),
    });
  };

  /** The save whose secret has been cleared from the form. */
  #clearedFor: unknown;

  protected override willUpdate(): void {
    const update = this.#update.value;

    // Once saved, the secret isn't kept in the form. A failed save keeps it,
    // so it can be fixed without typing it again
    if (AsyncResult.isSuccess(update) && update !== this.#clearedFor) {
      this.#clearedFor = update;
      this.clientSecret = "";
    }
  }

  #renderStatus(setup: DiscordSetup) {
    const items = steps(setup).map(
      (step) =>
        html`<li class="step" data-state=${step.state}>
          ${icon(stepIcons[step.state], stepLabels[step.state])}
          <span class="stack" style="--sb-stack-gap: 0">
            <strong class="small">${step.label}</strong>
            <span class="muted small">${step.detail}</span>
          </span>
        </li>`,
    );

    return html`
      <gw-card level=${this.cardLevel} heading="Status">
        <ol class="steps" aria-label="Setup progress">
          ${items}
        </ol>
        ${
          setup.error === ""
            ? nothing
            : html`<gw-alert
                tone="danger"
                urgent
                heading="Discord reported a problem"
              >
                ${sentence(setup.error)}
              </gw-alert>`
        }
      </gw-card>
    `;
  }

  #renderForm(setup: DiscordSetup) {
    const saving = this.#update.value.waiting;

    const result = actionResult(
      this.#update.value,
      "Saved. Discord will ask you to approve System Bridge.",
    );

    const clientId = this.clientId ?? setup.clientId;

    const invalid = result?.success === false;

    return html`
      <gw-card
        level=${this.cardLevel}
        heading="Discord application"
        description="Discord only lets apps you own read your voice settings"
      >
        <ol class="guide small">
          <li>
            Open the Discord Developer Portal and create an application.
            <gw-button
              variant="neutral"
              appearance="outlined"
              size="small"
              icon=${mdiOpenInNew}
              ><a href=${PORTAL_URL} target="_blank" rel="noopener noreferrer"
                >Developer Portal</a
              ></gw-button
            >
          </li>
          <li>
            On its <strong>OAuth2</strong> page, copy the client ID and client
            secret.
          </li>
          <li>
            On the same page, add this redirect and save:
            <span class="copy">
              <code>${setup.redirectUri}</code>
              <gw-button
                variant="neutral"
                appearance="plain"
                size="small"
                labels="hide"
                icon=${this.copied ? mdiCheckCircle : mdiContentCopy}
                data-value=${setup.redirectUri}
                @click=${this.#copyRedirect}
                >${this.copied ? "Redirect copied" : "Copy the redirect"}</gw-button
              >
            </span>
          </li>
          <li>
            Enter the client ID and secret here, then approve the prompt in
            Discord.
          </li>
        </ol>
        <form class="stack" @submit=${this.#onSubmit}>
          <div class="grid" style="--sb-grid-min: 14rem">
            <gw-input
              label="Client ID"
              name="clientId"
              inputmode="numeric"
              autocomplete="off"
              placeholder="A long number"
              required
              monospace
              ?disabled=${saving}
              .value=${clientId}
              @input=${this.#onClientIdInput}
            ></gw-input>
            <gw-input
              label="Client secret"
              name="clientSecret"
              type="password"
              autocomplete="off"
              required
              monospace
              reveal
              hint=${
                setup.configured
                  ? "Saved. Enter it again only to change the application."
                  : "Stored only on this system, and never shown again."
              }
              error=${invalid ? result.message : ""}
              ?disabled=${saving}
              .value=${this.clientSecret}
              @input=${this.#onSecretInput}
            ></gw-input>
          </div>
          ${
            result?.success === true
              ? html`<span class="hint" role="status">${result.message}</span>`
              : nothing
          }
          <div class="row" style="justify-content: flex-end">
            <gw-button
              type="submit"
              ?loading=${saving}
              ?disabled=${clientId.trim() === "" || this.clientSecret.trim() === ""}
              >${setup.configured ? "Save and reconnect" : "Save and connect"}</gw-button
            >
          </div>
        </form>
      </gw-card>
    `;
  }

  #renderContent() {
    const setup = Option.getOrUndefined(AsyncResult.value(this.#setup.value));

    if (setup === undefined) {
      return AsyncResult.isFailure(this.#setup.value)
        ? html`<gw-alert
            tone="danger"
            urgent
            heading="Couldn't read the Discord setup"
          >
            This System Bridge may be too old for setting up Discord here.
          </gw-alert>`
        : placeholder;
    }

    return html`${this.#renderStatus(setup)} ${this.#renderForm(setup)}`;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Setup",
          description: "Connect System Bridge to the Discord desktop app",
          icon: mdiCogOutline,
        })}
        ${this.gate(() => this.#renderContent(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-discord": PageSettingsDiscord;
  }
}
