export interface CreateSetting {
  key: string;
  value?: string;
}

export interface UpdateSetting {
  value?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export type SettingsValue =
  | null
  | boolean
  | string
  | number
  | SettingsObject
  | SettingsValue[];

export type SettingsObject = {
  [key: string]: SettingsValue;
};
