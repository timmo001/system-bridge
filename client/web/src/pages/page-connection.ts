import { mdiLanConnect } from "@mdi/js";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

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

  #field(
    key: "host" | "port",
    label: string,
    hint: string,
    placeholder: string,
  ) {
    return html`
      <gw-input
        label=${label}
        name=${key}
        inputmode=${key === "port" ? "numeric" : ""}
        placeholder=${placeholder}
        autocomplete="off"
        hint=${hint}
        error=${this.errors[key] ?? ""}
        .value=${this.form[key]}
        @input=${this.#onTextInput}
      ></gw-input>
    `;
  }

  override render() {
    const testing = this.#test.value.waiting;

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
        <form @submit=${this.#onSubmit} novalidate>
          <gw-card>
            <div class="stack">
              <div class="grid" style="--sb-grid-min: 14rem">
                ${this.#field(
                  "host",
                  "Host",
                  "The host name or IP address of the computer running System Bridge.",
                  "localhost",
                )}
                ${this.#field(
                  "port",
                  "Port",
                  "System Bridge listens on 9170 unless you've changed it.",
                  "9170",
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
              <gw-input
                label="API token"
                name="token"
                type="password"
                autocomplete="off"
                monospace
                reveal
                hint="Find it in System Bridge's settings, or run system-bridge client token."
                error=${this.errors.token ?? ""}
                .value=${this.form.token}
                @input=${this.#onTextInput}
              ></gw-input>
            </div>
            <div slot="footer" class="row" style="justify-content: flex-end">
              <gw-button type="submit" ?loading=${testing}>Connect</gw-button>
            </div>
          </gw-card>
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
