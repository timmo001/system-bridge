import React, {
  createContext,
  ReactElement,
  useContext,
  useState,
} from "react";

import { Configuration as ConfigurationEntity } from "../../assets/entities/configuration.entity";

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
