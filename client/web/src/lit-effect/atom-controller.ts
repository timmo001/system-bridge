/**
 * `AtomController`: keeps an Effect atom mounted for a Lit element and redraws
 * the element when it changes.
 *
 * @module
 */
import { ContextConsumer, createContext } from "@lit/context";
import type { ReactiveController, ReactiveElement } from "lit";
import { type Atom, AtomRegistry } from "effect/reactivity";

/**
 * The registry atoms are read from. Provide one high in the tree with
 * `ContextProvider` to give part of an app, or a test, its own registry.
 */
export const registryContext = createContext<AtomRegistry.AtomRegistry>(
  Symbol.for("gw-atom-registry"),
);

/** The registry used when nothing above a component provides one. */
export const defaultRegistry = AtomRegistry.make();

/**
 * Keeps an atom mounted while its host is connected, and redraws the host
 * whenever the atom changes. `select` runs before each render, so the atom
 * can depend on the host's properties.
 */
export class AtomController<A> implements ReactiveController {
  readonly #host: ReactiveElement;
  readonly #select: () => Atom.Atom<A>;
  readonly #consumer: ContextConsumer<typeof registryContext, ReactiveElement>;
  #atom: Atom.Atom<A> | undefined;
  #unsubscribe: (() => void) | undefined;

  constructor(host: ReactiveElement, select: () => Atom.Atom<A>) {
    this.#host = host;
    this.#select = select;
    this.#consumer = new ContextConsumer(host, { context: registryContext });
    host.addController(this);
  }

  get registry(): AtomRegistry.AtomRegistry {
    return this.#consumer.value ?? defaultRegistry;
  }

  get value(): A {
    return this.registry.get(this.#atom ?? this.#select());
  }

  hostConnected() {
    this.#host.requestUpdate();
  }

  hostUpdate() {
    const atom = this.#select();

    if (atom === this.#atom) return;

    this.#unsubscribe?.();
    this.#atom = atom;
    // Compute it first, so working out its first value isn't reported as a
    // change that needs another render
    this.registry.get(atom);
    this.#unsubscribe = this.registry.subscribe(atom, () =>
      this.#host.requestUpdate(),
    );
  }

  hostDisconnected() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#atom = undefined;
  }
}
