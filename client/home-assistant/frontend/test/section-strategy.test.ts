import { expect, test } from "bun:test";
import { configSections } from "../src/pages";
import type { SystemBridgeEntities } from "../src/registry";
import {
  joinSections,
  SECTIONS,
  type SectionContext,
  type SectionName,
} from "../src/sections";
import { STRATEGY_TYPE } from "../src/types";

const entities = (single: [string, string][]): SystemBridgeEntities => ({
  device: {
    id: "device",
    name: "example-host",
    name_by_user: null,
    identifiers: [["system_bridge", "uuid"]],
    configuration_url: null,
  },
  webClientUrl: undefined,
  single: new Map(single),
  items: {
    audio_input: new Map(),
    audio_output: new Map(),
    battery: new Map(),
    core: new Map(),
    disk: new Map(),
    display: new Map(),
    gpu: new Map(),
    interface: new Map(),
    mount: new Map(),
  },
});

const build = (
  sectionEntities: SystemBridgeEntities,
  sections: SectionName[],
) => {
  const context: SectionContext = {
    entities: sectionEntities,
    item: undefined,
    hours: 1,
    percentage: undefined,
    mediaFeatures: [],
    audioFeatures: [],
    inputSource: true,
    link: undefined,
  };

  return joinSections(sections.map((section) => SECTIONS[section](context)));
};

const headings = (sectionEntities: SystemBridgeEntities) =>
  build(sectionEntities, ["power-commands", "saved-commands"])
    ?.cards.filter((card) => card.type === "heading")
    .map((card) => ("heading" in card ? card.heading : undefined));

test("reads a Commands section saved before modules as both command sections", () => {
  expect(
    configSections({ type: STRATEGY_TYPE, section: "commands" }).sections,
  ).toEqual(["power-commands", "saved-commands"]);
});

test("puts a module's sections in its page order", () => {
  expect(
    configSections({
      type: STRATEGY_TYPE,
      module: "system",
      sections: ["saved-commands", "power-commands"],
    }).sections,
  ).toEqual(["power-commands", "saved-commands"]);
});

test("names sections that don't exist", () => {
  expect(
    configSections({ type: STRATEGY_TYPE, sections: ["system", "nope"] }),
  ).toEqual({ sections: ["system"], unknown: ["nope"] });
});

test("joins command sections, leaving out one with nothing to show", () => {
  const power: [string, string] = ["power_lock", "button.host_lock"];

  expect(headings(entities([power]))).toEqual(["Commands"]);
  expect(
    headings(entities([power, ["command_backup", "button.host_back_up"]])),
  ).toEqual(["Commands", "Saved commands"]);
  expect(build(entities([]), ["power-commands", "saved-commands"])).toBe(
    undefined,
  );
});
