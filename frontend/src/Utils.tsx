import React, {
  createContext,
  ReactElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Configuration } from "../../src/configuration";
import queryString from "query-string";

export function handleCopyToClipboard(value: string) {
  navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
    if (result.state === "granted" || result.state === "prompt") {
      navigator.clipboard.writeText(value);
    }
  });
}

export const parsedQuery = queryString.parse(window.location.search, {
  parseBooleans: true,
  parseNumbers: true,
});

const SettingsContext = createContext<Configuration | undefined>(undefined);
const SetSettingsContext = createContext<null | React.Dispatch<
  React.SetStateAction<Configuration | undefined>
>>(null);

export const SettingsProvider = ({
  children,
}: {
  children: ReactElement;
}): ReactElement => {
  const [config, setConfig] = useState<Configuration>();

  return (
    <SetSettingsContext.Provider value={setConfig}>
      <SettingsContext.Provider value={config}>
        {children}
      </SettingsContext.Provider>
    </SetSettingsContext.Provider>
  );
};

export const useSettings = (): [
  settings: Configuration | undefined,
  setSettings: React.Dispatch<React.SetStateAction<Configuration | undefined>>
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
