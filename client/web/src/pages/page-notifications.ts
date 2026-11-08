import { mdiBellOutline, mdiClose, mdiPlus, mdiSend } from "@mdi/js";
import { Notification } from "@timmo001/effect-system-bridge";
import { Option, Schema } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/define/gw-segmented.ts";
import type { Segment } from "@timmo001/groundwork-ui/gw-segmented.ts";
import "~/components/sb-recent-notifications";
import { selectValue } from "~/lib/select";
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

const urgencyOptions: readonly Segment[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "critical", label: "Critical" },
];

const decodeNotification = Schema.decodeUnknownOption(Notification);

interface ButtonForm {
  readonly id: string;
  readonly label: string;
}

/** As many buttons as notification daemons show. */
const MAX_BUTTONS = 3;

/** Why a button's id can't be used, if it can't. */
const buttonIdError = (
  buttons: readonly ButtonForm[],
  index: number,
): string => {
  const id = buttons[index]?.id.trim() ?? "";

  if (id === "default") {
    return "default is clicking the notification itself.";
  }

  if (
    id !== "" &&
    buttons.findIndex((button) => button.id.trim() === id) !== index
  ) {
    return "Another button has this id.";
  }

  return "";
};

/** Button fields are named button-<index>-<id or label>. */
const buttonField = /^button-(\d+)-(id|label)$/;

const isFieldKey = (name: string): name is FieldKey =>
  fields.some((field) => field.key === name);

/** Send a desktop notification to this system. */
@customElement("page-notifications")
export class PageNotifications extends SbPage {
  readonly #send = new AtomController(this, () => sendNotification);

  @state() private form: NotificationForm = emptyForm;

  /** Sent only when it isn't normal, which is the default. */
  @state() private urgency = "normal";

  @state() private buttons: readonly ButtonForm[] = [];

  protected readonly pageTitle = "Notifications";

  /** Fields are named after their key in the form. */
  #onInput = (event: InputEvent) => {
    const target = event.target;

    if (!(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    )) {
      return;
    }

    if (isFieldKey(target.name)) {
      this.form = { ...this.form, [target.name]: target.value };

      return;
    }

    const button = buttonField.exec(target.name);

    if (button !== null) {
      const index = Number(button[1]);
      const key = button[2] === "id" ? "id" : "label";

      this.buttons = this.buttons.map((current, at) =>
        at === index ? { ...current, [key]: target.value } : current,
      );
    }
  };

  #addButton = () => {
    this.buttons = [...this.buttons, { id: "", label: "" }];
  };

  /** Remove buttons carry their row's index. */
  #removeButton = (event: Event) => {
    const target = event.currentTarget;

    if (target instanceof HTMLElement) {
      const index = Number(target.dataset.index);

      this.buttons = this.buttons.filter((_, at) => at !== index);
    }
  };

  #clear = () => {
    this.form = emptyForm;
    this.urgency = "normal";
    this.buttons = [];
  };

  #onUrgency = (event: Event) => {
    this.urgency = selectValue(event);
  };

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    // Blank optional fields are left out, and the schema checks the rest
    const filled = fields.flatMap(({ key }) => {
      const value = this.form[key].trim();

      return value === "" ? [] : [[key, value] as const];
    });

    const urgency =
      this.urgency === "normal" ? [] : [["urgency", this.urgency] as const];

    const buttons =
      this.buttons.length === 0
        ? []
        : [
            [
              "buttons",
              this.buttons.map((button) => ({
                id: button.id.trim(),
                label: button.label.trim(),
              })),
            ] as const,
          ];

    Option.match(
      decodeNotification(
        Object.fromEntries([...filled, ...urgency, ...buttons]),
      ),
      {
        onNone: () => undefined,
        onSome: (notification) => registry.set(sendNotification, notification),
      },
    );
  };

  #renderField(field: Field, sending: boolean) {
    return html`
      <gw-input
        label=${field.label}
        name=${field.key}
        placeholder=${field.placeholder}
        hint=${field.hint ?? ""}
        ?required=${field.required === true}
        ?optional=${field.required !== true}
        ?multiline=${field.multiline === true}
        ?monospace=${field.key === "icon" || field.key === "sound"}
        ?disabled=${sending}
        .value=${this.form[field.key]}
        @input=${this.#onInput}
      ></gw-input>
    `;
  }

  #renderButtons(sending: boolean) {
    const rows = this.buttons.map(
      (button, index) => html`
        <div class="row" style="align-items: flex-start">
          <gw-input
            class="spacer"
            label="Button ${index + 1} id"
            name="button-${index}-id"
            placeholder="snooze"
            monospace
            required
            error=${buttonIdError(this.buttons, index)}
            ?disabled=${sending}
            .value=${button.id}
            @input=${this.#onInput}
          ></gw-input>
          <gw-input
            class="spacer"
            label="Label"
            name="button-${index}-label"
            placeholder="Snooze"
            required
            ?disabled=${sending}
            .value=${button.label}
            @input=${this.#onInput}
          ></gw-input>
          <gw-button
            variant="neutral"
            appearance="plain"
            icon=${mdiClose}
            data-index=${index}
            ?disabled=${sending}
            @click=${this.#removeButton}
            >Remove</gw-button
          >
        </div>
      `,
    );

    return html`
      <gw-setting-row
        heading="Buttons"
        description="Up to ${MAX_BUTTONS}, each with an id and a label. The id can't be default. Linux and Windows only."
      >
        <gw-button
          appearance="plain"
          size="small"
          icon=${mdiPlus}
          ?disabled=${sending || this.buttons.length >= MAX_BUTTONS}
          @click=${this.#addButton}
          >Add</gw-button
        >
      </gw-setting-row>
      ${rows}
    `;
  }

  #renderForm() {
    const sending = this.#send.value.waiting;

    const ready =
      this.form.title.trim() !== "" &&
      this.form.message.trim() !== "" &&
      this.buttons.every(
        (button, index) =>
          button.id.trim() !== "" &&
          button.label.trim() !== "" &&
          buttonIdError(this.buttons, index) === "",
      );

    const inputs = fields.map((field) => this.#renderField(field, sending));

    return html`
      <form @submit=${this.#onSubmit}>
        <gw-card>
          <div class="stack">
            ${inputs}
            <gw-setting-row
              heading="Urgency"
              description="Critical notifications stay until they're dismissed. Linux only."
            >
              <gw-segmented
                label="Urgency"
                size="small"
                .options=${urgencyOptions}
                .value=${this.urgency}
                @change=${this.#onUrgency}
              ></gw-segmented>
            </gw-setting-row>
            ${this.#renderButtons(sending)}
          </div>
          <div slot="footer" class="row" style="justify-content: flex-end">
            <gw-button
              variant="neutral"
              appearance="plain"
              ?disabled=${sending}
              @click=${this.#clear}
              >Clear</gw-button
            >
            <gw-button
              type="submit"
              icon=${mdiSend}
              ?loading=${sending}
              ?disabled=${!ready}
              >Send</gw-button
            >
          </div>
        </gw-card>
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
          () =>
            html`${this.#renderForm()}
              <gw-card
                level=${this.cardLevel}
                heading="Recent notifications"
                description="Sent while this page was open, from anywhere"
              >
                <sb-recent-notifications></sb-recent-notifications>
              </gw-card>`,
          html`<gw-skeleton
            style="min-height: 30rem; border-radius: var(--gw-radius-l)"
          ></gw-skeleton>`,
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
