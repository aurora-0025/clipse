import { createContext, ReactNode, useEffect, useState } from "react";
import { ConfigData } from "../../electron/typings/config";

export const ConfigContext = createContext<
  | {
      configData: ConfigData;
      setConfigData: React.Dispatch<React.SetStateAction<ConfigData>>;
    }
  | undefined
>(undefined);

interface Props {
  children?: ReactNode;
}

export const ConfigContextProvider = ({ children }: Props): React.ReactNode => {
  const [configData, setConfigData] = useState<ConfigData>({ paths: [] });

  /* TODO: READ CONFIG */
  useEffect(() => {
    readConfig();
    async function readConfig() {
      const config = (await window.api.read_config()) as ConfigData;
      setConfigData(config);
    }
  }, []);

  return (
    <ConfigContext.Provider value={{ configData, setConfigData }}>
      {children}
    </ConfigContext.Provider>
  );
};
