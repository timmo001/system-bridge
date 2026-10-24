import { mdiCheck, mdiPaletteOutline } from "@mdi/js";
import { Array } from "effect";
import { css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import { icon, pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { registry } from "~/lib/atoms";
import { appearance } from "~/lib/preferences";
import {
  type ColorScheme,
  defaultDarkTheme,
  defaultLightTheme,
  type Theme,
  type ThemeId,
  themeById,
  themeLabel,
  themes,
  themesFor,
} from "~/lib/themes";

import { SbPage } from "./sb-page";

const OTHER = "Other";

/**
 * A scheme's themes by family, the default family first. Other families with
 * only one theme in the scheme go together under "Other", last.
 */
const themeGroups = (
  scheme: ColorScheme,
): readonly (readonly [string, readonly Theme[]])[] => {
  const defaultFamily = themeById(
    scheme === "dark" ? defaultDarkTheme : defaultLightTheme,
    scheme,
  ).family;

  const families = Object.entries(
    Array.groupBy(themesFor(scheme), (theme) => theme.family),
  );

  const own = ([family, members]: readonly [string, readonly Theme[]]) =>
    family === defaultFamily || members.length > 1;

  const single = families.flatMap((entry) => (own(entry) ? [] : entry[1]));

  return [
    ...families.filter(([family]) => family === defaultFamily),
    ...families.filter((entry) => entry[0] !== defaultFamily && own(entry)),
    ...(single.length === 0 ? [] : [[OTHER, single] as const]),
  ];
};

/** The colour scheme and themes, kept in this browser. */
@customElement("page-settings-appearance")
export class PageSettingsAppearance extends SbPage {
  static override styles = [
    shared,
    pageStyles,
    css`
      /* Every card sits on one grid, so the columns line up across
         families. A family spans a column per theme and shares its rows with
         others; "Other" takes whole rows of its own */
      .families {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
        grid-auto-flow: row dense;
        gap: var(--sb-space-5) var(--sb-space-3);
      }

      .family {
        display: grid;
        grid-column: span var(--count);
        grid-template-columns: subgrid;
        row-gap: var(--sb-space-2);
        align-content: start;
      }

      .family.other {
        grid-column: 1 / -1;
      }

      /* Too few columns for a family to sit beside another */
      @media (width < 48rem) {
        .families {
          grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
        }

        .family {
          grid-column: 1 / -1;
        }
      }

      .section-title .chip {
        letter-spacing: normal;
        text-transform: none;
      }

      .family-name {
        grid-column: 1 / -1;
        margin: 0;
        font-size: var(--sb-font-size-s);
        font-weight: var(--sb-font-weight-semibold);
        color: var(--sb-color-muted);
      }

      .theme {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-2);
        padding: var(--sb-space-2);
        font: inherit;
        color: var(--sb-color-text);
        text-align: start;
        cursor: pointer;
        background: var(--sb-color-surface);
        border: 2px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
        transition: border-color var(--sb-duration-fast) var(--sb-easing);
      }

      .theme:hover {
        border-color: color-mix(
          in oklab,
          var(--sb-color-accent) 50%,
          var(--sb-color-border)
        );
      }

      .theme[aria-pressed="true"] {
        background: var(--sb-color-accent-soft);
        border-color: var(--sb-color-accent);
        box-shadow: 0 0 0 3px
          color-mix(in oklab, var(--sb-color-accent) 30%, transparent);
      }

      .theme[aria-pressed="true"] .name strong {
        color: var(--sb-color-accent);
      }

      .theme .check {
        position: absolute;
        top: var(--sb-space-3);
        right: var(--sb-space-3);
        display: grid;
        place-items: center;
        width: 1.5rem;
        height: 1.5rem;
        color: var(--sb-color-on-accent);
        background: var(--sb-color-accent);
        border-radius: 50%;
        --sb-icon-size: 1rem;
      }

      /* A small picture of the app in the theme's own colours */
      .preview {
        display: grid;
        grid-template-columns: 22% 1fr;
        gap: 6px;
        height: 6.5rem;
        padding: 6px;
        background: var(--p-bg);
        border-radius: var(--sb-radius-m);
      }

      .preview .rail {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 4px;
        border-radius: 4px;
      }

      .preview .rail i {
        height: 5px;
        background: var(--p-muted);
        border-radius: 3px;
        opacity: 0.5;
      }

      .preview .rail i:first-child {
        background: var(--p-accent);
        opacity: 1;
      }

      .preview .panel {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 6px;
        background: var(--p-surface);
        border: 1px solid var(--p-border);
        border-radius: 5px;
      }

      .preview .line {
        height: 5px;
        background: var(--p-text);
        border-radius: 3px;
      }

      .preview .line.short {
        width: 45%;
        background: var(--p-muted);
      }

      .preview .bars {
        display: flex;
        flex: 1;
        align-items: flex-end;
        gap: 3px;
      }

      .preview .bars i {
        flex: 1;
        border-radius: 2px 2px 0 0;
      }

      .name {
        display: flex;
        flex-direction: column;
        padding: 0 var(--sb-space-1) var(--sb-space-1);
      }
    `,
  ];

  readonly #appearance = new AtomController(this, () => appearance);

  protected readonly pageTitle = "Appearance";

  #choose(id: string) {
    const theme = themes.find((candidate) => candidate.id === id);
    const current = this.#appearance.value;

    if (theme === undefined) return;

    registry.set(appearance, {
      ...current,
      [theme.scheme]: theme.id,
      // Show the chosen theme, unless the system already decides
      mode: current.mode === "system" ? "system" : theme.scheme,
    });
  }

  /** Each theme card's value is its theme's ID. */
  #onThemeClick = (event: MouseEvent) => {
    if (event.currentTarget instanceof HTMLButtonElement) {
      this.#choose(event.currentTarget.value);
    }
  };

  /** A theme's card. Under "Other" it's named by its family, not its variant. */
  #renderTheme(theme: Theme, chosen: boolean, other: boolean) {
    const { colors } = theme;

    const bars = colors.chart.map(
      (colour, index) =>
        html`<i
          style="height: ${30 + ((index * 37) % 70)}%; background: ${colour}"
        ></i>`,
    );

    return html`
      <button
        class="theme"
        type="button"
        value=${theme.id}
        aria-pressed=${chosen ? "true" : "false"}
        @click=${this.#onThemeClick}
      >
        <span
          class="preview"
          aria-hidden="true"
          style="--p-bg: ${colors.bg}; --p-surface: ${colors.surface}; --p-border: ${colors.border}; --p-text: ${colors.text}; --p-muted: ${colors.muted}; --p-accent: ${colors.accent}"
        >
          <span class="rail"><i></i><i></i><i></i><i></i></span>
          <span class="panel">
            <span class="line" style="width: 60%"></span>
            <span class="line short"></span>
            <span class="bars">${bars}</span>
          </span>
        </span>
        <span class="name">
          <strong class="small">${other ? theme.family : theme.name}</strong>
          ${
            other && theme.name !== theme.family
              ? html`<span class="muted xsmall">${theme.name}</span>`
              : ""
          }
        </span>
        ${chosen ? html`<span class="check">${icon(mdiCheck)}</span>` : ""}
      </button>
    `;
  }

  /** A scheme's themes, in a group for each family. */
  #renderGallery(scheme: ColorScheme, chosen: string) {
    return html`
      <div class="families">
        ${repeat(
          themeGroups(scheme),
          ([group]) => group,
          ([group, members]) => html`
            <div
              class="family ${group === OTHER ? "other" : ""}"
              style="--count: ${members.length}"
            >
              <h3 class="family-name">${group}</h3>
              ${repeat(
                members,
                (theme) => theme.id,
                (theme) =>
                  this.#renderTheme(
                    theme,
                    theme.id === chosen,
                    group === OTHER,
                  ),
              )}
            </div>
          `,
        )}
      </div>
    `;
  }

  /** A scheme's gallery, its heading naming the theme in use. */
  #renderSection(scheme: ColorScheme, heading: string, chosen: ThemeId) {
    return html`
      <section class="stack">
        <h2 class="section-title row">
          ${heading}
          <span class="chip accent"
            >${themeLabel(themeById(chosen, scheme))}</span
          >
        </h2>
        ${this.#renderGallery(scheme, chosen)}
      </section>
    `;
  }

  override render() {
    const current = this.#appearance.value;

    return html`
      <div class="page">
        ${this.renderHeader({
          heading: "Appearance",
          description:
            "Colours for this browser. Pick a theme for dark and one for light; switch between them, or follow the system, from the header.",
          icon: mdiPaletteOutline,
        })}
        ${this.#renderSection("dark", "Dark themes", current.dark)}
        ${this.#renderSection("light", "Light themes", current.light)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-appearance": PageSettingsAppearance;
  }
}
