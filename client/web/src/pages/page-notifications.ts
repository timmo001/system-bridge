import { mdiBellOutline, mdiSend } from "@mdi/js";
import { Notification } from "@timmo001/effect-system-bridge";
import { Option, Schema } from "effect";
import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { icon, spinner } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, registry, sendNotification } from "~/lib/atoms";

import { SbPage } from "./sb-page";

interface NotificationForm {
  readonly title: string;
  readonly message: string;
  readonly icon: string;
  readonly actionUrl: string;
  readonly sound: string;
}

type FieldKey = keyof NotificationForm;

const emptyForm: NotificationForm = {
  title: "",
  message: "",
  icon: "",
  actionUrl: "",
  sound: "",
};

interface Field {
  readonly key: FieldKey;
  readonly label: string;
  readonly placeholder: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly multiline?: boolean;
}

const fields: readonly Field[] = [
  {
    key: "title",
    label: "Title",
    placeholder: "Backup finished",
    required: true,
  },
  {
    key: "message",
    label: "Message",
    placeholder: "All files were copied",
    required: true,
    multiline: true,
  },
  {
    key: "icon",
    label: "Icon",
    placeholder: "/path/to/icon.png",
    hint: "A path to an image on that system.",
  },
  {
    key: "actionUrl",
    label: "Link",
    placeholder: "https://example.com",
    hint: "Opened when the notification is clicked.",
  },
  {
    key: "sound",
    label: "Sound",
    placeholder: "/path/to/sound.wav",
    hint: "A path to a sound file on that system.",
  },
];

const decodeNotification = Schema.decodeUnknownOption(Notification);

const isFieldKey = (name: string): name is FieldKey =>
  fields.some((field) => field.key === name);

/** Send a desktop notification to this system. */
@customElement("page-notifications")
export class PageNotifications extends SbPage {
  readonly #send = new AtomController(this, () => sendNotification);

  @state() private form: NotificationForm = emptyForm;

  protected readonly pageTitle = "Notifications";

  /** Fields are named after their key in the form. */
  #onInput = (event: InputEvent) => {
    const target = event.target;

    if (
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement) &&
      isFieldKey(target.name)
    ) {
      this.form = { ...this.form, [target.name]: target.value };
    }
  };

  #clear = () => {
    this.form = emptyForm;
  };

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    // Blank optional fields are left out, and the schema checks the rest
    const filled = fields.flatMap(({ key }) => {
      const value = this.form[key].trim();

      return value === "" ? [] : [[key, value] as const];
    });

    Option.match(decodeNotification(Object.fromEntries(filled)), {
      onNone: () => undefined,
      onSome: (notification) => registry.set(sendNotification, notification),
    });
  };

  #renderField(field: Field, sending: boolean) {
    const control = field.multiline
      ? html`<textarea
          class="input"
          id=${field.key}
          name=${field.key}
          rows="3"
          style="padding-block: var(--sb-space-2); resize: vertical"
          placeholder=${field.placeholder}
          ?required=${field.required === true}
          ?disabled=${sending}
          .value=${this.form[field.key]}
          @input=${this.#onInput}
        ></textarea>`
      : html`<input
          class="input"
          id=${field.key}
          name=${field.key}
          placeholder=${field.placeholder}
          ?required=${field.required === true}
          ?disabled=${sending}
          .value=${this.form[field.key]}
          @input=${this.#onInput}
        />`;

    return html`
      <div class="field">
        <label for=${field.key}
          >${field.label}${
            field.required
              ? nothing
              : html` <span class="muted">(optional)</span>`
          }</label
        >
        ${control}
        ${
          field.hint === undefined
            ? nothing
            : html`<span class="hint">${field.hint}</span>`
        }
      </div>
    `;
  }

  #renderForm() {
    const sending = this.#send.value.waiting;

    const ready =
      this.form.title.trim() !== "" && this.form.message.trim() !== "";

    const inputs = fields.map((field) => this.#renderField(field, sending));

    return html`
      <form class="card" @submit=${this.#onSubmit}>
        ${inputs}
        <div class="row" style="justify-content: flex-end">
          <button
            class="button plain"
            type="button"
            ?disabled=${sending}
            @click=${this.#clear}
          >
            Clear
          </button>
          <button
            class="button filled"
            type="submit"
            ?disabled=${sending || !ready}
          >
            ${sending ? spinner() : icon(mdiSend)} Send
          </button>
        </div>
      </form>
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Notifications",
          description:
            "Send a desktop notification, shown by the system's own notifications",
          icon: mdiBellOutline,
        })}
        ${this.renderResult(
          actionResult(this.#send.value, "The notification was sent."),
        )}
        ${this.gate(
          () => this.#renderForm(),
          html`<span
            class="skeleton"
            style="min-height: 30rem; border-radius: var(--sb-radius-l)"
          ></span>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-notifications": PageNotifications;
  }
}
