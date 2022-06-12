import { NameValue } from "./types.entity";

export type SettingsValue =
  | null
  | boolean
  | string
  | number
  | SettingsObject
  | SettingsValue[]
  | NameValue
  | NameValue[];

export type SettingsObject = {
  [key: string]: SettingsValue;
};
