import { useContext, useEffect } from "react";
import { ConfigContext } from "./context/ConfigContext";
import FirstRun from "./windows/FirstRun";
import {
  SelectedContextProvider,
} from "./context/SelectedContext";
import TitleBar from "./windows/components/TitleBar";
import GalleryPage from "./windows/Search";

function App(): JSX.Element {
  // useEffect(() => {
  //   const observedElement = document.body;
  //   if (!observedElement) return;
  //   const resizeWindow = () => {
  //     console.log(document.body.scrollWidth);
      
  //     window.api.resize_win(
  //       document.body.scrollWidth,
  //       document.body.scrollHeight,
  //     );
  //   };
  //   const resizeObserver = new ResizeObserver(() => {
  //     resizeWindow();
  //   });

  //   const mutationObserver = new MutationObserver(() => {
  //     resizeWindow();
  //   });
  //   resizeObserver.observe(observedElement);
  //   mutationObserver.observe(observedElement, {
  //     childList: true,
  //     subtree: true,
  //     attributes: true,
  //   });

  //   return () => {
  //     resizeObserver.disconnect();
  //     mutationObserver.disconnect();
  //   };
  // }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { configData } = useContext(ConfigContext)!;

  useEffect(() => {
    console.log(configData);
  }, [configData]);

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white">
        <TitleBar />
        <div className="flex flex-col max-h-full overflow-y-hidden ">
          {configData.paths.length > 0 ? (
            <SelectedContextProvider>
              <GalleryPage />
            </SelectedContextProvider>
          ) : (
            <FirstRun />
          )}
        </div>
    </div>
  );
}

export default App;
