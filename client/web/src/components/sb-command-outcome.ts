import type { CommandResult } from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@timmo001/groundwork-ui/define/gw-chip.ts";
import { shared } from "./shared-styles";
import { type BridgeError, errorMessage } from "~/lib/atoms";

type CommandOutcome = Omit<CommandResult, "commandID">;

/** A finished run, with failures shown like a failed command. */
const outcome = (
  execution: AsyncResult.AsyncResult<CommandResult, BridgeError>,
): CommandOutcome | undefined => {
  if (AsyncResult.isSuccess(execution)) return execution.value;

  if (!AsyncResult.isFailure(execution)) return undefined;

  return {
    exitCode: 1,
    stdout: "",
    stderr: "",
    error: Option.match(AsyncResult.error(execution), {
      onNone: () => "The command couldn't run",
      onSome: errorMessage,
    }),
  };
};

/**
 * How a command's last run went, once it's finished: its exit code, and what
 * it printed. Shows nothing before it has run or while it runs.
 */
@customElement("sb-command-outcome")
export class SbCommandOutcome extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: block;
      }

      pre {
        margin: 0;
        max-height: 12rem;
        padding: var(--gw-space-3);
        overflow: auto;
        font-size: var(--gw-font-size-xs);
        background: var(--gw-color-surface-raised);
        border: 1px solid var(--gw-color-border-normal);
        border-radius: var(--gw-radius-m);
      }
    `,
  ];

  @property({ attribute: false }) execution:
    AsyncResult.AsyncResult<CommandResult, BridgeError> | undefined;

  override render() {
    const result =
      this.execution === undefined || this.execution.waiting
        ? undefined
        : outcome(this.execution);

    if (result === undefined) return nothing;

    const ok = result.exitCode === 0;

    return html`
      <div class="stack" style="--sb-stack-gap: var(--gw-space-2)">
        <gw-chip
          size="small"
          tone=${ok ? "success" : "danger"}
          style="align-self: start"
        >
          Exit code
          ${result.exitCode}${result.error ? ` · ${result.error}` : ""}
        </gw-chip>
        ${result.stdout ? html`<pre>${result.stdout}</pre>` : nothing}
        ${
          result.stderr
            ? html`<pre style="color: var(--gw-color-danger)">
${result.stderr}</pre>`
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-command-outcome": SbCommandOutcome;
  }
}
