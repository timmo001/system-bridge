import React, {
  createContext,
  ReactElement,
  useContext,
  useState,
} from "react";

import { Information as InformationEntity } from "../../assets/entities/information.entity";

const InformationContext = createContext<InformationEntity | undefined>(
  undefined
);
const SetInformationContext = createContext<null | React.Dispatch<
  React.SetStateAction<InformationEntity | undefined>
>>(null);

export const InformationProvider = ({
  children,
}: {
  children: ReactElement;
}): ReactElement => {
  const [config, setConfig] = useState<InformationEntity>();

  return (
    <SetInformationContext.Provider value={setConfig}>
      <InformationContext.Provider value={config}>
        {children}
      </InformationContext.Provider>
    </SetInformationContext.Provider>
  );
};

export const useInformation = (): [
  information: InformationEntity | undefined,
  setInformation: React.Dispatch<
    React.SetStateAction<InformationEntity | undefined>
  >
] => {
  const information = useContext(InformationContext);
  const setInformation = useContext(SetInformationContext);
  if (setInformation === null) throw new Error(); // this will make setInformation non-null
  return [information, setInformation];
};
