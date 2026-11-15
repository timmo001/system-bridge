import { mdiDevices, mdiDeleteOutline, mdiDownload, mdiQrcode } from "@mdi/js";
import "@timmo001/groundwork-ui/define/gw-pairing.ts";
import type {
  Mobile,
  MobilePushOptions,
  ShellPushState,
} from "@timmo001/groundwork-mobile/view";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import { AtomController } from "~/controllers/atom-controller";
import { connectionSettings, registry } from "~/lib/atoms";
import { baseUrl } from "~/lib/backend";
import { canInstall, install } from "~/lib/install";
import { mobile, pushClient } from "~/lib/mobile";
import {
  makePairingOffer,
  PushKind,
  type PushSubscriber,
  pushSubscribers,
  removePushSubscriber,
  setPushKinds,
} from "~/lib/devices";

import { SbPage } from "./sb-page";

const kindInfo: Readonly<
  Record<PushKind, { readonly heading: string; readonly description: string }>
> = {
  notifications: {
    heading: "Notifications",
    description: "The notifications System Bridge shows on this computer",
  },
  updates: {
    heading: "Updates",
    description: "When a new System Bridge release is out",
  },
};

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** The kinds a subscriber gets, as words, such as "Notifications, Updates". */
const kindsText = (kinds: readonly PushKind[]) =>
  kinds.length === 0
    ? "Nothing"
    : kinds.map((kind) => kindInfo[kind].heading).join(", ");

/**
 * The devices that connect to this computer: pairing the Android app
 * through a QR code, this phone or browser's own pushes, and every device
 * it pushes to.
 */
@customElement("page-settings-devices")
export class PageSettingsDevices extends SbPage {
  static override styles = [...SbPage.styles];

  protected readonly pageTitle = "Devices";

  readonly #settings = new AtomController(this, () => connectionSettings);

  readonly #subscribers = new AtomController(this, () => pushSubscribers);

  readonly #canInstall = new AtomController(this, () => canInstall);
  readonly #remove = new AtomController(this, () => removePushSubscriber);

  readonly #kinds = new AtomController(this, () => setPushKinds);

  /** The shell or the PWA's pieces, once connected. */
  @state() private mobile: Mobile | undefined;

  /** Whether this device gets pushes, or `undefined` while it's checked. */
  @state() private push: ShellPushState | undefined;

  @state() private pushBusy = false;

  /** Whether the pairing card shows a code, which is only made once asked. */
  @state() private pairing = false;

  /** Why turning pushes on or off last failed. */
  @state() private pushError: string | undefined;

  /** This install, as its push subscription names it. */
  @state() private client: MobilePushOptions["client"] | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    void mobile.then(async (connected) => {
      this.client = await pushClient(connected);
      this.push = await connected.pushState();
      this.mobile = connected;
    });
  }

  #startPairing = () => {
    this.pairing = true;
  };

  #makeOffer = () => makePairingOffer(this.#settings.value);

  #onRemove = (event: Event) => {
    const id =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.dataset.client
        : undefined;

    if (id === undefined) return;

    // This device's own entry: turn its pushes off here too, as its switch
    // does, so the switch doesn't stay on for a subscription that's gone
    if (id === this.client?.id) void this.#setPush(false);
    else registry.set(removePushSubscriber, id);
  };

  /** Where this device's pushes are kept, with the token to reach it. */
  #pushOptions(client: MobilePushOptions["client"]): MobilePushOptions {
    const settings = this.#settings.value;

    return {
      service: `${baseUrl(settings)}/api/`,
      client,
      headers: { "X-API-Token": settings.token ?? "" },
    };
  }

  #onPushToggle = (event: Event) => {
    if (event.target instanceof HTMLInputElement)
      void this.#setPush(event.target.checked);
  };

  /** Subscribes this device to pushes, or unsubscribes it. */
  #setPush = async (on: boolean) => {
    const current = this.mobile;
    const client = this.client;

    if (current === undefined || client === undefined) return;

    this.pushBusy = true;
    this.pushError = undefined;

    try {
      if (on) {
        this.push = await current.subscribePush(this.#pushOptions(client));

        if (this.push === "default") {
          this.pushError = "The computer didn't take the subscription";
        }
      } else {
        await current.unsubscribePush(this.#pushOptions(client));
        this.push = await current.pushState();
      }
    } catch (error) {
      this.pushError =
        error instanceof Error ? error.message : "Something went wrong";
    } finally {
      this.pushBusy = false;
      registry.refresh(pushSubscribers);
    }
  };

  #onKindToggle = (event: Event) => {
    const target = event.target;
    const id = this.client?.id;

    if (id === undefined || !(target instanceof HTMLInputElement)) return;

    const mine = this.#subscriberList().find((sub) => sub.client.id === id);
    const kind = PushKind.literals.find((known) => known === target.name);

    if (mine === undefined || kind === undefined) return;

    registry.set(setPushKinds, {
      clientId: id,
      kinds: target.checked
        ? [...mine.kinds.filter((known) => known !== kind), kind]
        : mine.kinds.filter((known) => known !== kind),
    });
  };

  #subscriberList(): readonly PushSubscriber[] {
    return Option.getOrElse(
      AsyncResult.value(this.#subscribers.value),
      () => [],
    );
  }

  #renderPairing() {
    // In the app, the phone can't scan its own screen: it adds computers
    // from its own menu instead. Wait to know, so the card doesn't flash
    if (this.mobile === undefined || this.mobile.shell) return nothing;

    return html`
      <gw-card
        heading="Pair the Android app"
        description="Scan this with the System Bridge app on your phone. Pairing gives the phone this computer's API token."
        icon=${mdiQrcode}
        level=${this.cardLevel}
      >
        ${
          this.pairing
            ? html`<gw-pairing .make=${this.#makeOffer}></gw-pairing>`
            : html`<gw-button
                appearance="filled"
                icon=${mdiQrcode}
                @click=${this.#startPairing}
                >Make a pairing code</gw-button
              >`
        }
      </gw-card>
    `;
  }

  #renderSubscribers() {
    const result = this.#subscribers.value;
    const list = this.#subscriberList();

    return html`
      <gw-card
        heading="Devices getting pushes"
        description="Each chooses what it gets, on the device itself"
        icon=${mdiDevices}
        level=${this.cardLevel}
      >
        ${
          AsyncResult.isFailure(result)
            ? html`<p class="error-text">
                ${Option.match(AsyncResult.error(result), {
                  onNone: () => "Couldn't load the list",
                  onSome: (error) => error.message,
                })}
              </p>`
            : list.length === 0
              ? html`<p class="muted small">
                  ${result.waiting ? "Loading…" : "Nothing is subscribed yet."}
                </p>`
              : list.map(
                  (sub) => html`
                    <gw-setting-row
                      heading=${sub.client.name}
                      description="${sub.client.platform === "android" ? "Android app" : "Browser"} · ${kindsText(sub.kinds)} · Added ${date.format(new Date(sub.created))}"
                    >
                      <gw-button
                        variant="danger"
                        appearance="plain"
                        icon=${mdiDeleteOutline}
                        data-client=${sub.client.id}
                        ?loading=${this.#remove.value.waiting}
                        @click=${this.#onRemove}
                        >Remove</gw-button
                      >
                    </gw-setting-row>
                  `,
                )
        }
      </gw-card>
    `;
  }

  #renderThisDevice() {
    const current = this.mobile;

    if (current === undefined || this.push === undefined) return nothing;

    if (!current.shell && this.push === "unsupported") {
      return html`
        <gw-card heading="This browser" level=${this.cardLevel}>
          <p class="muted small">
            Pushes need the System Bridge app, or this page over HTTPS.
          </p>
        </gw-card>
      `;
    }

    const mine = this.#subscriberList().find(
      (sub) => sub.client.id === this.client?.id,
    );

    // On only while the computer has this device too: another device may
    // have removed it. Until the list loads, the device's own state shows
    const listed =
      mine !== undefined || !AsyncResult.isSuccess(this.#subscribers.value);

    return html`
      <gw-card
        heading=${current.shell ? "This phone" : "This browser"}
        level=${this.cardLevel}
      >
        <gw-setting-row
          heading="Get pushes"
          description=${
            this.push === "denied"
              ? "Notifications are blocked. Allow them in the system's settings."
              : "Hear from this computer while the app is closed"
          }
        >
          <gw-switch
            label="Get pushes"
            label-hidden
            .checked=${live(this.push === "subscribed" && listed)}
            ?disabled=${this.pushBusy || this.push === "denied"}
            @change=${this.#onPushToggle}
          ></gw-switch>
        </gw-setting-row>
        ${
          this.pushError === undefined
            ? nothing
            : html`<p class="error-text">${this.pushError}</p>`
        }
        ${
          mine === undefined
            ? nothing
            : PushKind.literals.map(
                (kind) => html`
                  <gw-setting-row
                    heading=${kindInfo[kind].heading}
                    description=${kindInfo[kind].description}
                  >
                    <gw-switch
                      label=${kindInfo[kind].heading}
                      label-hidden
                      name=${kind}
                      .checked=${live(mine.kinds.includes(kind))}
                      ?disabled=${this.#kinds.value.waiting}
                      @change=${this.#onKindToggle}
                    ></gw-switch>
                  </gw-setting-row>
                `,
              )
        }
      </gw-card>
    `;
  }

  #renderInstall() {
    if (!this.#canInstall.value) return nothing;

    return html`
      <gw-card
        heading="Install System Bridge"
        description="Open System Bridge in its own window, like any other app, and get its pushes while it's closed."
        icon=${mdiDownload}
        level=${this.cardLevel}
      >
        <gw-button appearance="filled" icon=${mdiDownload} @click=${install}
          >Install</gw-button
        >
      </gw-card>
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Devices",
          description: this.mobile?.shell
            ? "Choose what this phone hears from this computer, and which other devices do"
            : "Pair the Android app, and choose which phones and browsers hear from this computer",
          icon: mdiDevices,
        })}
        ${this.gate(
          () => html`
            ${this.#renderPairing()} ${this.#renderInstall()}
            ${this.#renderThisDevice()} ${this.#renderSubscribers()}
          `,
          html`<gw-skeleton
            style="min-height: 18rem; border-radius: var(--gw-radius-l)"
          ></gw-skeleton>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-devices": PageSettingsDevices;
  }
}
