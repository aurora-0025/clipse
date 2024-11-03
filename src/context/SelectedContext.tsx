import { createContext, ReactNode, useState } from "react";

interface ImageResult {
  name: string;
  path: string;
}

const SelectedContext = createContext<
  | {
      selectedImages: ImageResult[];
      setSelectedImages: React.Dispatch<React.SetStateAction<ImageResult[]>>;
    }
  | undefined
>(undefined);

interface Props {
  children?: ReactNode;
}

const SelectedContextProvider = ({ children }: Props): React.ReactNode => {
  const [selectedImages, setSelectedImages] = useState<ImageResult[]>([]);

  return (
    <SelectedContext.Provider value={{ selectedImages, setSelectedImages }}>
      {children}
    </SelectedContext.Provider>
  );
};

export { SelectedContextProvider, SelectedContext };
