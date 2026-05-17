import {
  type CliRenderer,
  BoxRenderable,
  TextRenderable,
  InputRenderable,
  type KeyEvent,
  t,
  bold,
  dim,
  fg,
} from "@opentui/core";
import type { FlagField, FlagPopupAction, MenuAction } from "../types.js";
import type { Theme } from "../theme.js";

const log = (msg: string) => console.error(`[sb-tui:FlagPopup] ${msg}`);

/** Width of the popup box in characters */
const POPUP_WIDTH = 60;
/** Width of the label column */
const LABEL_WIDTH = 14;

/** Runtime state for a single flag field */
interface FieldState {
  readonly field: FlagField;
  value: string;
  readonly inputRenderable?: InputRenderable;
}

/** Configuration for the {@link FlagPopup} component */
export interface FlagPopupOptions {
  /** Called when the user submits the form — receives the fully assembled command */
  readonly onSubmit: (action: MenuAction) => void;
  /** Called when the popup is dismissed without submission */
  readonly onDismiss: () => void;
}

/**
 * Centred popup overlay presenting a form for CLI flag values.
 *
 * Supports string inputs, boolean toggles, and select fields.
 * Optional "Advanced options" collapse for less-used flags.
 */
export class FlagPopup {
  private renderer: CliRenderer;
  private theme: Theme;
  private root: BoxRenderable;
  private titleText: TextRenderable;
  private fieldsContainer: BoxRenderable;
  private advancedToggle: TextRenderable | null = null;
  private separator: TextRenderable;
  private helpText: TextRenderable;
  private callbacks: FlagPopupOptions;

  private fieldStates: FieldState[] = [];
  private focusedFieldIndex = 0;
  private advancedExpanded = false;
  private advancedFieldIndices: readonly number[] = [];
  private currentAction: FlagPopupAction | null = null;

  /** Rows for each field (label + value display) */
  private fieldRows: BoxRenderable[] = [];
  private fieldValueTexts: TextRenderable[] = [];

  constructor(
    renderer: CliRenderer,
    theme: Theme,
    options: FlagPopupOptions,
  ) {
    this.renderer = renderer;
    this.theme = theme;
    this.callbacks = options;

    // Outer absolutely positioned container — hidden by default
    this.root = new BoxRenderable(renderer, {
      id: "flag-popup-root",
      position: "absolute",
      width: POPUP_WIDTH,
      zIndex: 150,
      visible: false,
      borderStyle: "rounded",
      borderColor: theme.accent,
      backgroundColor: theme.bgElevated,
      flexDirection: "column",
      paddingLeft: 1,
      paddingRight: 1,
      paddingTop: 0,
      paddingBottom: 0,
    });

    // Title
    this.titleText = new TextRenderable(renderer, {
      id: "flag-popup-title",
      content: t``,
      marginBottom: 1,
    });
    this.root.add(this.titleText);

    // Fields container
    this.fieldsContainer = new BoxRenderable(renderer, {
      id: "flag-popup-fields",
      flexDirection: "column",
      width: "100%",
    });
    this.root.add(this.fieldsContainer);

    // Separator line
    this.separator = new TextRenderable(renderer, {
      id: "flag-popup-sep",
      content: t`${fg(theme.fgSubtle)("─".repeat(POPUP_WIDTH - 4))}`,
      marginTop: 1,
    });
    this.root.add(this.separator);

    // Help text
    this.helpText = new TextRenderable(renderer, {
      id: "flag-popup-help",
      content: t`${dim("↑↓")} ${dim("navigate")}  ${dim("Space")} ${dim("toggle")}  ${dim("Enter")} ${dim("run")}  ${dim("Esc")} ${dim("cancel")}`,
    });
    this.root.add(this.helpText);

    renderer.root.add(this.root);
  }

  /** Whether the popup is currently visible */
  get visible(): boolean {
    return this.root.visible;
  }

  /**
   * Show the popup for a flag popup action.
   *
   * Populates the form fields, positions the popup centrally, and takes focus.
   */
  show(action: FlagPopupAction): void {
    this.currentAction = action;
    this.advancedFieldIndices = action.advancedFieldIndices ?? [];
    this.advancedExpanded = this.advancedFieldIndices.length === 0;

    // Set title
    this.titleText.content = t`${bold(fg(this.theme.accent)(action.title))}`;

    // Clear previous fields
    this.clearFields();

    // Build field states
    this.fieldStates = action.fields.map((field) => ({
      field,
      value: field.defaultValue ?? (field.type === "bool" ? "false" : ""),
    }));

    // Build field rows
    this.buildFieldRows();

    // Focus first visible field
    this.focusedFieldIndex = 0;
    this.updateFieldStyles();

    // Calculate popup height and position
    this.repositionPopup();

    this.root.visible = true;
  }

  /** Hide the popup and release focus */
  hide(): void {
    this.root.visible = false;
    this.currentAction = null;
    // Blur any focused inputs
    for (const state of this.fieldStates) {
      state.inputRenderable?.blur();
    }
  }

  /** Handle keyboard input when the popup has focus */
  handleKeyPress(key: KeyEvent): boolean {
    const state = this.fieldStates[this.focusedFieldIndex];

    switch (key.name) {
      case "escape":
        this.hide();
        this.callbacks.onDismiss();
        return true;

      case "up":
        this.moveFocus(-1);
        return true;

      case "down":
        this.moveFocus(1);
        return true;

      case "tab":
        if (key.shift) {
          this.moveFocus(-1);
        } else {
          this.moveFocus(1);
        }
        return true;

      case "return":
        // Check if focused on advanced toggle
        if (this.isAdvancedToggleFocused()) {
          this.toggleAdvanced();
          return true;
        }
        this.submit();
        return true;

      case "space":
        if (state && state.field.type === "bool") {
          state.value = state.value === "true" ? "false" : "true";
          this.updateFieldDisplay(this.focusedFieldIndex);
          return true;
        }
        if (this.isAdvancedToggleFocused()) {
          this.toggleAdvanced();
          return true;
        }
        // For string fields, the focused InputRenderable handles it via its own listener
        if (state?.inputRenderable) {
          return true;
        }
        return false;

      default:
        // For string input fields, the focused InputRenderable handles its own
        // keypress events — just swallow the key so App doesn't process it further.
        if (state?.field.type === "string" && state.inputRenderable) {
          return true;
        }
        // For select fields, handle left/right to cycle options
        if (state?.field.type === "select" && state.field.options) {
          if (key.name === "left" || key.name === "right") {
            const opts = state.field.options;
            if (opts.length === 0) return false;
            const currentIdx = opts.indexOf(state.value);
            const delta = key.name === "right" ? 1 : -1;
            const nextIdx =
              currentIdx < 0
                ? 0
                : (currentIdx + delta + opts.length) % opts.length;
            state.value = opts[nextIdx];
            this.updateFieldDisplay(this.focusedFieldIndex);
            return true;
          }
        }
        return false;
    }
  }

  /** Dynamically update a select field's options (e.g. after fetching module list) */
  updateSelectOptions(fieldName: string, options: readonly string[]): void {
    const state = this.fieldStates.find((s) => s.field.name === fieldName);
    if (state && state.field.type === "select") {
      // Mutate the field options in-place (cast away readonly for runtime update)
      (state.field as { options: readonly string[] }).options = options;
      if (options.length > 0 && !options.includes(state.value)) {
        state.value = options[0];
      }
      const idx = this.fieldStates.indexOf(state);
      if (idx >= 0) this.updateFieldDisplay(idx);
    }
  }

  // -- Private helpers --

  private clearFields(): void {
    for (const row of this.fieldRows) {
      this.fieldsContainer.remove(row.id);
    }
    if (this.advancedToggle) {
      this.fieldsContainer.remove(this.advancedToggle.id);
      this.advancedToggle = null;
    }
    this.fieldRows = [];
    this.fieldValueTexts = [];
    this.fieldStates = [];
  }

  private buildFieldRows(): void {
    const th = this.theme;

    for (let i = 0; i < this.fieldStates.length; i++) {
      const state = this.fieldStates[i];
      const isAdvanced = this.advancedFieldIndices.includes(i);
      const visible = !isAdvanced || this.advancedExpanded;

      const row = new BoxRenderable(this.renderer, {
        id: `flag-popup-field-${i}`,
        flexDirection: "row",
        width: "100%",
        visible,
      });

      // Label
      const label = new TextRenderable(this.renderer, {
        id: `flag-popup-label-${i}`,
        content: t`${fg(th.fgMuted)(state.field.label.padEnd(LABEL_WIDTH))}`,
        width: LABEL_WIDTH,
      });
      row.add(label);

      // Value display
      if (state.field.type === "string") {
        const input = new InputRenderable(this.renderer, {
          id: `flag-popup-input-${i}`,
          value: state.value,
          placeholder: state.field.placeholder ?? "",
          backgroundColor: th.bgInput,
          textColor: th.fg,
          cursorColor: th.accent,
          placeholderColor: th.fgGhost,
          flexGrow: 1,
        });
        // Sync input value back to state on change
        input.on("change", () => {
          state.value = input.value;
        });
        (state as { inputRenderable: InputRenderable }).inputRenderable = input;
        row.add(input);

        const valueText = new TextRenderable(this.renderer, {
          id: `flag-popup-value-${i}`,
          content: t``,
          visible: false,
        });
        this.fieldValueTexts.push(valueText);
      } else {
        const valueText = new TextRenderable(this.renderer, {
          id: `flag-popup-value-${i}`,
          content: this.formatFieldValue(state),
          flexGrow: 1,
        });
        row.add(valueText);
        this.fieldValueTexts.push(valueText);
      }

      this.fieldsContainer.add(row);
      this.fieldRows.push(row);
    }

    // Add advanced toggle if there are advanced fields
    if (this.advancedFieldIndices.length > 0) {
      this.advancedToggle = new TextRenderable(this.renderer, {
        id: "flag-popup-advanced-toggle",
        content: this.formatAdvancedToggle(false),
        marginTop: 1,
      });
      this.fieldsContainer.add(this.advancedToggle);
    }
  }

  private formatFieldValue(state: FieldState): ReturnType<typeof t> {
    const th = this.theme;

    if (state.field.type === "bool") {
      const checked = state.value === "true";
      if (checked) {
        return t`${fg(th.fg)("[")}${fg(th.green)("✓")}${fg(th.fg)("]")}`;
      }
      return t`${fg(th.fg)("[ ]")}`;
    }

    if (state.field.type === "select") {
      const opts = state.field.options ?? [];
      if (opts.length === 0) {
        return t`${fg(th.fgGhost)("(loading...)")}`;
      }
      return t`${fg(th.accent)("◂")} ${fg(th.fg)(state.value || opts[0])} ${fg(th.accent)("▸")}`;
    }

    return t`${fg(th.fg)(state.value)}`;
  }

  private formatAdvancedToggle(focused: boolean): ReturnType<typeof t> {
    const th = this.theme;
    const color = focused ? th.accent : th.fgMuted;
    const icon = this.advancedExpanded ? "▾" : "▸";
    const label = this.advancedExpanded
      ? "Hide advanced options"
      : "Advanced options...";
    return t`${fg(color)(`${icon} ${label}`)}`;
  }

  private updateFieldDisplay(index: number): void {
    const state = this.fieldStates[index];
    if (!state) return;

    if (state.field.type !== "string") {
      const valueText = this.fieldValueTexts[index];
      if (valueText) {
        valueText.content = this.formatFieldValue(state);
      }
    }
  }

  private updateFieldStyles(): void {
    const th = this.theme;
    const visibleIndices = this.getVisibleFieldIndices();

    for (let vi = 0; vi < visibleIndices.length; vi++) {
      const fi = visibleIndices[vi];
      const row = this.fieldRows[fi];
      const state = this.fieldStates[fi];
      const isFocused = fi === this.focusedFieldIndex;

      if (row) {
        row.backgroundColor = isFocused ? th.bgSelected : th.bgElevated;
      }

      // Focus/blur InputRenderable for string fields
      if (state?.inputRenderable) {
        if (isFocused) {
          state.inputRenderable.focus();
        } else {
          state.inputRenderable.blur();
        }
      }
    }

    // Style advanced toggle if it has focus
    if (this.advancedToggle) {
      this.advancedToggle.content = this.formatAdvancedToggle(
        this.isAdvancedToggleFocused(),
      );
    }
  }

  private getVisibleFieldIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.fieldStates.length; i++) {
      const isAdvanced = this.advancedFieldIndices.includes(i);
      if (!isAdvanced || this.advancedExpanded) {
        indices.push(i);
      }
    }
    return indices;
  }

  /** Total focusable positions: visible fields + optional advanced toggle */
  private getFocusableCount(): number {
    const visibleFields = this.getVisibleFieldIndices().length;
    const hasToggle = this.advancedFieldIndices.length > 0;
    return visibleFields + (hasToggle ? 1 : 0);
  }

  private isAdvancedToggleFocused(): boolean {
    if (this.advancedFieldIndices.length === 0) return false;
    const visibleFields = this.getVisibleFieldIndices();
    // The toggle is after all visible fields
    return this.focusedFieldIndex >= this.fieldStates.length;
  }

  private moveFocus(delta: number): void {
    const visible = this.getVisibleFieldIndices();
    const hasToggle = this.advancedFieldIndices.length > 0;

    // Build a list of all focusable positions
    const focusable: number[] = [...visible];
    // Use a sentinel value for the advanced toggle
    const TOGGLE_INDEX = 9999;
    if (hasToggle) focusable.push(TOGGLE_INDEX);

    // Find current position in focusable list
    const currentFocusable = this.isAdvancedToggleFocused()
      ? TOGGLE_INDEX
      : this.focusedFieldIndex;
    let pos = focusable.indexOf(currentFocusable);
    if (pos < 0) pos = 0;

    // Move
    pos = (pos + delta + focusable.length) % focusable.length;
    const nextFocusable = focusable[pos];

    if (nextFocusable === TOGGLE_INDEX) {
      this.focusedFieldIndex = this.fieldStates.length; // sentinel
    } else {
      this.focusedFieldIndex = nextFocusable;
    }

    this.updateFieldStyles();
  }

  private toggleAdvanced(): void {
    this.advancedExpanded = !this.advancedExpanded;

    // Show/hide advanced field rows
    for (const idx of this.advancedFieldIndices) {
      const row = this.fieldRows[idx];
      if (row) row.visible = this.advancedExpanded;
    }

    // Update toggle text
    if (this.advancedToggle) {
      this.advancedToggle.content = this.formatAdvancedToggle(true);
    }

    // Reposition popup for new height
    this.repositionPopup();
  }

  private repositionPopup(): void {
    const visibleFieldCount = this.getVisibleFieldIndices().length;
    const hasToggle = this.advancedFieldIndices.length > 0;
    // Each field = 1 line, border(2) + title(1) + titleMargin(1) + sep(1) + sepMargin(1) + help(1) + toggle(1 if present) + toggleMargin(1 if present)
    const chromeLines = 7 + (hasToggle ? 2 : 0);
    const totalHeight = visibleFieldCount + chromeLines;

    const termHeight = this.renderer.height;
    const termWidth = this.renderer.width;
    const top = Math.max(1, Math.floor((termHeight - totalHeight) / 2));
    const left = Math.max(1, Math.floor((termWidth - POPUP_WIDTH) / 2));

    this.root.top = top;
    this.root.left = left;
    this.root.height = totalHeight;
  }

  private submit(): void {
    if (!this.currentAction) return;

    // Validate required fields
    for (const state of this.fieldStates) {
      if (state.field.required && !state.value) {
        log(`Required field missing: ${state.field.name}`);
        return;
      }
    }

    // Build command string
    let cmd = this.currentAction.baseCmd;
    for (const state of this.fieldStates) {
      if (!state.value || state.value === "false") continue;

      if (state.field.type === "bool" && state.value === "true") {
        cmd += ` --${state.field.name}`;
      } else if (state.field.type === "string" || state.field.type === "select") {
        // Shell-quote the value
        const quoted = state.value.replace(/'/g, "'\\''");
        cmd += ` --${state.field.name} '${quoted}'`;
      }
    }

    log(`Submitting command: ${cmd}`);
    this.hide();
    this.callbacks.onSubmit({ type: "command", cmd, wait: true });
  }

  /** Remove the popup from the render tree */
  destroy(): void {
    this.hide();
    this.renderer.root.remove(this.root.id);
  }
}
