import type { Settings } from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import type { PropertyValues } from "lit";

import { AtomController } from "../controllers/atom-controller";
import { actionResult, registry, settings, updateSettings } from "../lib/atoms";

import { PageElement } from "./page-element";

/**
 * Base class for pages that edit the backend's settings. Subclasses get the
 * loaded settings, a `settingsLoaded` hook to fill their form when they
 * change, and `saveSettings` to send an update.
 */
export abstract class SettingsPageElement extends PageElement {
  readonly #settings = new AtomController(this, () => settings);

  readonly #update = new AtomController(this, () => updateSettings);

  #loaded: Settings | undefined;

  protected get settings(): Settings | undefined {
    return Option.getOrUndefined(AsyncResult.value(this.#settings.value));
  }

  protected get isSaving(): boolean {
    return this.#update.value.waiting;
  }

  /** Why the last save failed, if it did. */
  protected get saveError(): string | null {
    const result = actionResult(this.#update.value, "");

    return result && !result.success ? result.message : null;
  }

  protected saveSettings(next: Settings): void {
    registry.set(updateSettings, next);
  }

  /** Runs whenever new settings arrive from the backend. */
  protected abstract settingsLoaded(settings: Settings): void;

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    const current = this.settings;

    if (current && current !== this.#loaded) {
      this.#loaded = current;
      this.settingsLoaded(current);
    }
  }
}
