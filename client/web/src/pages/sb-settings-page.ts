import type { Settings } from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import type { PropertyValues } from "lit";

import { AtomController } from "~/controllers/atom-controller";
import { actionResult, registry, settings, updateSettings } from "~/lib/atoms";

import { SbPage } from "./sb-page";

/**
 * The base for pages that edit the backend's settings. Subclasses get the
 * loaded settings, a `settingsLoaded` hook to fill their form when they
 * change, and `saveSettings` to send an update.
 */
export abstract class SbSettingsPage extends SbPage {
  readonly #settings = new AtomController(this, () => settings);

  readonly #update = new AtomController(this, () => updateSettings);

  #loaded: Settings | undefined;

  protected get settings(): Settings | undefined {
    return Option.getOrUndefined(AsyncResult.value(this.#settings.value));
  }

  protected get isSaving(): boolean {
    return this.#update.value.waiting;
  }

  /** The outcome of the last save, for `renderResult`. */
  protected get saveResult() {
    return actionResult(this.#update.value, "Settings saved.");
  }

  protected saveSettings(next: Settings): void {
    registry.set(updateSettings, next);
  }

  /** Runs whenever new settings arrive from the backend. */
  protected abstract settingsLoaded(settings: Settings): void;

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    const current = this.settings;

    if (current !== undefined && current !== this.#loaded) {
      this.#loaded = current;
      this.settingsLoaded(current);
    }
  }
}
