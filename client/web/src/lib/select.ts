import { GwSelect } from "@timmo001/groundwork-ui/gw-select.ts";

/** The value a `gw-select` changed to, from its `change` event. */
export const selectValue = (event: Event): string =>
  event.currentTarget instanceof GwSelect ? event.currentTarget.value : "";
