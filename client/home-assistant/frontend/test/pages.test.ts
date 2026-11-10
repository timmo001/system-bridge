import { expect, test } from "bun:test";
import { PAGES } from "../src/pages";
import type { SystemBridgeEntities } from "../src/registry";

const item = (name: string) => ({
  name,
  fields: new Map<string, string>(),
  labels: new Map<string, string>(),
});

// One of everything a page lays out per item, so every layout has its sections
const entities: SystemBridgeEntities = {
  device: {
    id: "device",
    name: "example-host",
    name_by_user: null,
    identifiers: [["system_bridge", "uuid"]],
    configuration_url: null,
  },
  webClientUrl: undefined,
  single: new Map(),
  items: {
    audio_input: new Map([["mic", item("mic")]]),
    audio_output: new Map([["speakers", item("speakers")]]),
    battery: new Map([["mouse", item("mouse")]]),
    core: new Map([["0", item("0")]]),
    disk: new Map([["sda", item("sda")]]),
    display: new Map([["eDP-1", item("eDP-1")]]),
    gpu: new Map([["card0", item("card0")]]),
    interface: new Map([["eno1", item("eno1")]]),
    mount: new Map([["/", item("/")]]),
  },
};

test("the editor offers every section a module's view shows", () => {
  for (const page of PAGES) {
    const shown = page.layout(entities).flatMap(({ sections }) => sections);

    expect({
      page: page.page,
      missing: shown.filter((section) => !page.sections.includes(section)),
    }).toEqual({
      page: page.page,
      missing: [],
    });
  }
});
