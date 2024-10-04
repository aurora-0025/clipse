import { useContext, useEffect } from "react";
import { ConfigContext } from "./context/ConfigContext";
import FirstRun from "./windows/FirstRun";
import Search from "./windows/Search";

function App(): JSX.Element {
  useEffect(() => {
    const observedElement = document.body;
    if (!observedElement) return;
    const resizeWindow = () => {
      window.api.resize_win(
        document.body.scrollWidth > 600 ? document.body.scrollWidth : 600,
        document.body.scrollHeight,
      );
    };
    const resizeObserver = new ResizeObserver(() => {
      resizeWindow();
    });

    const mutationObserver = new MutationObserver(() => {
      resizeWindow();
    });
    resizeObserver.observe(observedElement);
    mutationObserver.observe(observedElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { configData } = useContext(ConfigContext)!;

  useEffect(() => {
    console.log(configData);
  }, [configData]);

  return (
    <div className="h-fit p-2">
      {configData.paths.length > 0 ? <Search /> : <FirstRun />}
    </div>
  );
}

export default App;
