export enum SettingAPIEnum {
  Token = "token",
  Port = "port",
}

export enum SettingHotkeyEnum {
  Name = "name",
  Key = "key",
}

export enum SettingDirectoryEnum {
  Name = "name",
  Path = "path",
}

export enum SettingMediaEnum {
  Directories = "directories",
}

export enum SettingEnum {
  API = "api",
  Autostart = "autostart",
  KeyboardHotkeys = "keyboard_hotkeys",
  LogLevel = "log_level",
  Media = "media",
}

export interface SettingsAPI {
  token: string;
  port: number;
}

export interface SettingHotkey {
  name: string;
  key: string;
}

export interface SettingDirectory {
  name: string;
  path: string;
}

export interface SettingsMedia {
  directories: SettingDirectory[];
}

export interface Settings {
  api: SettingsAPI;
  autostart: boolean;
  keyboard_hotkeys: SettingHotkey[];
  log_level: string;
  media: SettingsMedia;
}
