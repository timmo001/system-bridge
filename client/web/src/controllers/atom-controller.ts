import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { Atom } from "effect/reactivity";

import { registry } from "~/lib/atoms";

/**
 * Keeps an atom mounted while its host is connected, and redraws the host
 * whenever the atom changes. `select` runs before each render, so the atom
 * can depend on the host's properties.
 */
export class AtomController<A> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #select: () => Atom.Atom<A>;
  #atom: Atom.Atom<A> | undefined;
  #unsubscribe: (() => void) | undefined;

  constructor(host: ReactiveControllerHost, select: () => Atom.Atom<A>) {
    this.#host = host;
    this.#select = select;
    host.addController(this);
  }

  get value(): A {
    return registry.get(this.#atom ?? this.#select());
  }

  hostConnected() {
    this.#host.requestUpdate();
  }

  hostUpdate() {
    const atom = this.#select();

    if (atom === this.#atom) {
      return;
    }

    this.#unsubscribe?.();
    this.#atom = atom;
    this.#unsubscribe = registry.subscribe(atom, () =>
      this.#host.requestUpdate(),
    );
  }

  hostDisconnected() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#atom = undefined;
  }
}
