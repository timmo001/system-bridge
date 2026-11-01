import { GwSegmented } from "@timmo001/groundwork-ui/gw-segmented.ts";
import { GwSelect } from "@timmo001/groundwork-ui/gw-select.ts";
import { Option, Schema } from "effect";

/** The value a `gw-select` or `gw-segmented` changed to, from its `change` event. */
export const selectValue = (event: Event): string =>
  event.currentTarget instanceof GwSelect ||
  event.currentTarget instanceof GwSegmented
    ? event.currentTarget.value
    : "";

const MenuSelectDetail = Schema.Struct({ value: Schema.String });

const MenuCheckDetail = Schema.Struct({
  value: Schema.String,
  checked: Schema.Boolean,
});

const decodeSelect = Schema.decodeUnknownOption(MenuSelectDetail);

const decodeCheck = Schema.decodeUnknownOption(MenuCheckDetail);

/** The value of the item chosen in a `gw-menu-button`, from its `select` event. */
export const menuValue = (event: Event): string =>
  decodeSelect(event instanceof CustomEvent ? event.detail : undefined).pipe(
    Option.match({ onNone: () => "", onSome: ({ value }) => value }),
  );

/** The checkbox item toggled in a `gw-menu-button`, from its `check` event. */
export const menuCheck = (event: Event): typeof MenuCheckDetail.Type =>
  Option.getOrElse(
    decodeCheck(event instanceof CustomEvent ? event.detail : undefined),
    () => ({ value: "", checked: false }),
  );
