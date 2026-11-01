import { mdiEye, mdiEyeOff, mdiLanConnect } from "@mdi/js";
import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { icon, spinner } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  connectionSettings,
  registry,
  testConnection,
} from "~/lib/atoms";

import { SbPage } from "./sb-page";

interface ConnectionForm {
  readonly host: string;
  readonly port: string;
  readonly ssl: boolean;
  readonly token: string;
}

type FormErrors = Partial<Record<keyof ConnectionForm, string>>;

const validate = (form: ConnectionForm): FormErrors => {
  const port = Number(form.port);

  return {
    ...(form.host.trim() === "" && { host: "Enter a host" }),
    ...(!(Number.isInteger(port) && port >= 1 && port <= 65535) && {
      port: "Enter a port from 1 to 65535",
    }),
    ...(form.token === "" && { token: "Enter the API token" }),
  };
};

/** Where to find System Bridge, and the token to use. */
@customElement("page-connection")
export class PageConnection extends SbPage {
  readonly #test = new AtomController(this, () => testConnection);

  @state() private form: ConnectionForm = {
    host: "",
    port: "",
    ssl: false,
    token: "",
  };

  @state() private errors: FormErrors = {};

  @state() private showToken = false;

  protected readonly pageTitle = "Connection";

  override connectedCallback(): void {
    super.connectedCallback();

    const current = registry.get(connectionSettings);

    this.form = {
      host: current.host,
      port: String(current.port),
      ssl: current.ssl,
      token: current.token ?? "",
    };
  }

  #set<K extends keyof ConnectionForm>(key: K, value: ConnectionForm[K]) {
    this.form = { ...this.form, [key]: value };
  }

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    this.errors = validate(this.form);

    if (Object.keys(this.errors).length > 0) return;

    const { host, port, ssl, token } = this.form;

    registry.set(testConnection, {
      settings: { host: host.trim(), port: Number(port), ssl, token },
      token,
    });
  };

  /** Text fields are named after their key in the form. */
  #onTextInput = (event: InputEvent) => {
    if (!(event.target instanceof HTMLInputElement)) return;

    const { name, value } = event.target;

    if (name === "host" || name === "port" || name === "token") {
      this.#set(name, value);
    }
  };

  #onSslChange = (event: Event) => {
    if (event.target instanceof HTMLInputElement) {
      this.#set("ssl", event.target.checked);
    }
  };

  #toggleToken = () => {
    this.showToken = !this.showToken;
  };

  #field(
    key: "host" | "port",
    label: string,
    hint: string,
    attributes: { readonly type: string; readonly placeholder: string },
  ) {
    const error = this.errors[key];

    return html`
      <div class="field">
        <label for=${key}>${label}</label>
        <input
          class="input"
          id=${key}
          name=${key}
          type=${attributes.type}
          inputmode=${key === "port" ? "numeric" : nothing}
          placeholder=${attributes.placeholder}
          autocomplete="off"
          aria-invalid=${error === undefined ? "false" : "true"}
          aria-describedby=${
            error === undefined ? `${key}-hint` : `${key}-hint ${key}-error`
          }
          .value=${this.form[key]}
          @input=${this.#onTextInput}
        />
        <span class="hint" id="${key}-hint">${hint}</span>
        ${
          error === undefined
            ? nothing
            : html`<span class="error-text" id="${key}-error" role="alert"
                >${error}</span
              >`
        }
      </div>
    `;
  }

  override render() {
    const testing = this.#test.value.waiting;
    const tokenError = this.errors.token;

    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Connection",
          description:
            "Where to find System Bridge, and the API token to use. The settings are kept in this browser.",
          icon: mdiLanConnect,
        })}
        ${this.renderResult(
          actionResult(this.#test.value, "Connected to System Bridge."),
        )}
        <form class="card" @submit=${this.#onSubmit} novalidate>
          <div class="grid" style="--sb-grid-min: 14rem">
            ${this.#field(
              "host",
              "Host",
              "The host name or IP address of the computer running System Bridge.",
              { type: "text", placeholder: "localhost" },
            )}
            ${this.#field(
              "port",
              "Port",
              "System Bridge listens on 9170 unless you've changed it.",
              { type: "text", placeholder: "9170" },
            )}
          </div>
          <gw-setting-row
            heading="Use a secure connection"
            description="Turn on when System Bridge is behind HTTPS."
          >
            <gw-switch
              label="Use a secure connection"
              label-hidden
              .checked=${this.form.ssl}
              @change=${this.#onSslChange}
            ></gw-switch>
          </gw-setting-row>
          <div class="field">
            <label for="token">API token</label>
            <div class="row">
              <input
                class="input mono"
                id="token"
                name="token"
                type=${this.showToken ? "text" : "password"}
                autocomplete="off"
                aria-invalid=${tokenError === undefined ? "false" : "true"}
                aria-describedby=${
                  tokenError === undefined
                    ? "token-hint"
                    : "token-hint token-error"
                }
                .value=${this.form.token}
                @input=${this.#onTextInput}
              />
              <button
                class="button icon-only"
                type="button"
                aria-label=${this.showToken ? "Hide token" : "Show token"}
                aria-pressed=${this.showToken ? "true" : "false"}
                @click=${this.#toggleToken}
              >
                ${icon(this.showToken ? mdiEyeOff : mdiEye)}
              </button>
            </div>
            <span class="hint" id="token-hint"
              >Find it in System Bridge's settings, or with
              <code>system-bridge client token</code>.</span
            >
            ${
              tokenError === undefined
                ? nothing
                : html`<span class="error-text" id="token-error" role="alert"
                    >${tokenError}</span
                  >`
            }
          </div>
          <div class="row" style="justify-content: flex-end">
            <button class="button filled" type="submit" ?disabled=${testing}>
              ${testing ? spinner() : nothing}
              ${testing ? "Connecting…" : "Connect"}
            </button>
          </div>
        </form>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-connection": PageConnection;
  }
}
