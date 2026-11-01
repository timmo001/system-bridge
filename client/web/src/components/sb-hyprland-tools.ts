import { AsyncResult } from "effect/reactivity";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-select.ts";
import { selectValue } from "~/lib/select";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  type HyprlandTool,
  hyprlandTool,
  registry,
} from "~/lib/atoms";

type ToolTag = HyprlandTool["_tag"];

interface ToolField {
  readonly name: string;
  readonly label: string;
  readonly placeholder: string;
  readonly number?: boolean;
}

interface ToolDefinition {
  readonly label: string;
  readonly fields: readonly ToolField[];
  readonly hint?: string;
}

const codeHint = "Needs Hyprland code turned on in the Desktop settings.";

const optionField: ToolField = {
  name: "name",
  label: "Option",
  placeholder: "general.border_size",
};

const tools: Readonly<Record<ToolTag, ToolDefinition>> = {
  getOption: { label: "Read an option", fields: [optionField] },
  setOption: {
    label: "Set an option",
    fields: [optionField, { name: "value", label: "Value", placeholder: "2" }],
    hint: "Until the config reloads.",
  },
  cursor: { label: "Cursor position", fields: [] },
  moveCursor: {
    label: "Move the cursor",
    fields: [
      { name: "x", label: "X", placeholder: "0", number: true },
      { name: "y", label: "Y", placeholder: "0", number: true },
    ],
  },
  log: { label: "Read the log", fields: [] },
  event: {
    label: "Send an event",
    fields: [{ name: "name", label: "Event", placeholder: "dock" }],
  },
  exec: {
    label: "Run a command",
    fields: [{ name: "command", label: "Command", placeholder: "kitty" }],
    hint: codeHint,
  },
  raw: {
    label: "Run a dispatch",
    fields: [
      {
        name: "dispatch",
        label: "Dispatch",
        placeholder: 'hl.dsp.focus({ workspace = "1" })',
      },
    ],
    hint: `Written in the config's language. ${codeHint}`,
  },
  eval: {
    label: "Run Lua",
    fields: [
      {
        name: "code",
        label: "Lua",
        placeholder: 'hl.notification.create({ text = "Hi" })',
      },
    ],
    hint: `Needs a Lua config. ${codeHint}`,
  },
};

const toolOptions = Object.entries(tools).map(([value, { label }]) => ({
  value,
  label,
}));

const isToolTag = (value: string): value is ToolTag =>
  Object.hasOwn(tools, value);

/** The request for a tool, from its form's fields. */
const toolRequest = (
  tag: ToolTag,
  form: HTMLFormElement,
): HyprlandTool | null => {
  const text = (name: string) => {
    const input = form.elements.namedItem(name);

    return input instanceof HTMLInputElement ? input.value.trim() : "";
  };

  switch (tag) {
    case "getOption":
      return { _tag: tag, name: text("name") };
    case "setOption":
      return { _tag: tag, name: text("name"), value: text("value") };
    case "cursor":
    case "log":
      return { _tag: tag };
    case "moveCursor": {
      const x = Number(text("x"));
      const y = Number(text("y"));

      return Number.isInteger(x) && Number.isInteger(y)
        ? { _tag: tag, x, y }
        : null;
    }

    case "event":
      return { _tag: tag, name: text("name") };
    case "exec":
      return { _tag: tag, command: text("command") };
    case "raw":
      return { _tag: tag, dispatch: text("dispatch") };
    case "eval":
      return { _tag: tag, code: text("code") };
  }
};

const fieldInput = (field: ToolField) =>
  html`<input
    class="input ${field.number ? "number" : ""}"
    name=${field.name}
    type=${field.number ? "number" : "text"}
    step=${field.number ? "1" : nothing}
    required
    aria-label=${field.label}
    placeholder=${field.placeholder}
  />`;

/** Reads options, the cursor and the log, and runs actions, on Hyprland. */
@customElement("sb-hyprland-tools")
export class SbHyprlandTools extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-2);
      }

      form {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sb-space-2);
      }

      .input {
        flex: 1 1 10rem;
        min-width: 0;
      }

      .input.number {
        flex: 0 1 6rem;
      }

      pre {
        margin: 0;
        max-height: 16rem;
        padding: var(--sb-space-3);
        overflow: auto;
        font-size: var(--sb-font-size-xs);
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--sb-color-surface);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-m);
      }
    `,
  ];

  @state() private tool: ToolTag = "getOption";

  readonly #run = new AtomController(this, () => hyprlandTool);

  #onTool = (event: Event) => {
    const value = selectValue(event);

    if (isToolTag(value)) this.tool = value;
  };

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (!(event.currentTarget instanceof HTMLFormElement)) return;

    const request = toolRequest(this.tool, event.currentTarget);

    if (request) registry.set(hyprlandTool, request);
  };

  override render() {
    const tool = tools[this.tool];
    const fields = tool.fields.map(fieldInput);
    const result = this.#run.value;
    const failure = actionResult(result, "");
    const output = AsyncResult.isSuccess(result) ? result.value : null;

    return html`
      <form @submit=${this.#onSubmit}>
        <gw-select
          label="Tool"
          label-hidden
          .options=${toolOptions}
          .value=${this.tool}
          @change=${this.#onTool}
        ></gw-select>
        ${fields}
        <button
          class="button tonal small"
          type="submit"
          ?disabled=${result.waiting}
        >
          Run
        </button>
      </form>
      ${tool.hint ? html`<p class="muted small">${tool.hint}</p>` : nothing}
      ${
        failure?.success === false
          ? html`<span class="error-text" role="alert"
              >${failure.message}</span
            >`
          : nothing
      }
      ${output === null ? nothing : html`<pre>${output}</pre>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-hyprland-tools": SbHyprlandTools;
  }
}
