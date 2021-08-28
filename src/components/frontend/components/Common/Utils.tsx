import React, {
  createContext,
  ReactElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ParsedUrlQuery } from "querystring";
import axios from "axios";

import { Configuration as ConfigurationEntity } from "assets/entities/configuration.entity";
import { defaultConfiguration } from "assets/data/defaultSettings";
import { Setting } from "assets/entities/settings.entity";

export function handleCopyToClipboard(value: string) {
  navigator.permissions
    .query({ name: "clipboard-write" as PermissionName })
    .then((result) => {
      if (result.state === "granted" || result.state === "prompt") {
        navigator.clipboard.writeText(value);
      }
    });
}

const SettingsContext = createContext<ConfigurationEntity | undefined>(
  undefined
);
const SetSettingsContext = createContext<null | React.Dispatch<
  React.SetStateAction<ConfigurationEntity | undefined>
>>(null);

export const SettingsProvider = ({
  children,
}: {
  children: ReactElement;
}): ReactElement => {
  const [config, setConfig] = useState<ConfigurationEntity>();

  return (
    <SetSettingsContext.Provider value={setConfig}>
      <SettingsContext.Provider value={config}>
        {children}
      </SettingsContext.Provider>
    </SetSettingsContext.Provider>
  );
};

export const useSettings = (): [
  settings: ConfigurationEntity | undefined,
  setSettings: React.Dispatch<
    React.SetStateAction<ConfigurationEntity | undefined>
  >
] => {
  const settings = useContext(SettingsContext);
  const setSettings = useContext(SetSettingsContext);
  if (setSettings === null) throw new Error(); // this will make setSettings non-null
  return [settings, setSettings];
};

export function usePrevious(value: any): unknown {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export async function getSettings(
  query: ParsedUrlQuery
): Promise<ConfigurationEntity | undefined> {
  const response = await axios.get<Setting[]>(
    `http://${query.apiHost || "localhost"}:${query.apiPort || 9170}/settings`,
    {
      headers: { "api-key": query.apiKey },
    }
  );
  const s: ConfigurationEntity = defaultConfiguration;
  Object.keys(s).forEach((sectionKey: string) => {
    Object.keys(s[sectionKey].items).forEach((itemKey: string) => {
      const settingValue = response.data.find(({ key }: Setting) => {
        const keys = key.split("-");
        return keys[0] === sectionKey && keys[1] === itemKey;
      })?.value;
      const defaultValue = s[sectionKey].items[itemKey].defaultValue;
      const value = settingValue || s[sectionKey].items[itemKey].defaultValue;
      s[sectionKey].items[itemKey].value =
        typeof defaultValue === "boolean"
          ? value === "true"
          : typeof defaultValue === "number"
          ? Number(value)
          : value;
      if (!settingValue)
        axios.post<Setting>(
          `http://${query.apiHost || "localhost"}:${
            query.apiPort || 9170
          }/settings`,
          {
            key: `${sectionKey}-${itemKey}`,
            value: String(s[sectionKey].items[itemKey].defaultValue),
          },
          {
            headers: { "api-key": query.apiKey },
          }
        );
    });
  });
  return s;
}
