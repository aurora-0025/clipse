import { useContext, useEffect, useState } from "react";
import { ConfigData } from "../../electron/typings/config";
import { ConfigContext } from "../context/ConfigContext";

function FirstRun() {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const { configData, setConfigData } = useContext(ConfigContext)!;
  const [progressMessage, setProgressMessage] = useState<string>("");

  useEffect(() => {
    window.api.send_index_progress((message: string) => {
      setProgressMessage(message);
    });

    return () => {
      window.api.remove_index_progress_listener();
    };
  }, []);

  const selectFolders = async () => {
    const tag = "[API: select_dir]";
    try {
      const result = (await window.api.select_dir()) as Electron.OpenDialogReturnValue;
      if (!result.canceled) {
        console.log(tag + "selected " + result.filePaths.length + "directories");
        setSelectedFolders([
          ...selectedFolders,
          ...result.filePaths.filter((f) => selectedFolders.indexOf(f) == -1)
        ]);
      } else console.log(tag + "dialog cancelled");
    } catch (error) {
      console.error(tag + "[ERROR]" + error);
    }
  };

  const submit = async () => {
    const tag = "[API: write_config]";
    try {
      const data: ConfigData = {
        paths: []
      };
      data.paths = [
        ...configData.paths,
        ...selectedFolders.filter((p) => configData.paths.indexOf(p) == -1)
      ];
      await window.api.write_config(data);
      const result = await window.api.index_files(data.paths);
      console.log(result);
      if ("success" in result) {
        setConfigData(data);
      }
    } catch (error) {
      console.error(tag + "[ERROR]" + error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold">Welcome to Insight!</h1>
      <p className="mb-3">Select the folders that you want to index below.</p>
      <div className="mb-3 max-h-[120px] min-h-[120px] overflow-y-scroll rounded-sm bg-slate-100 p-2">
        {selectedFolders.length > 0 && (
          <ul>
            {selectedFolders.map((folder, index) => (
              <li className="flex items-center justify-between p-1" key={index}>
                <span className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="#000"
                    viewBox="0 0 16 16"
                  >
                    <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139q.323-.119.684-.12h5.396z" />
                  </svg>
                  {folder}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="#ff0000"
                  viewBox="0 0 16 16"
                >
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                </svg>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-between gap-2">
        <button
          className="rounded-md border-2 bg-white px-3 py-2 font-medium text-black"
          onClick={selectFolders}
        >
          + Folders
        </button>
        {selectedFolders.length > 0 && (
          <button
            className="rounded-md border-2 border-emerald-400 bg-emerald-100/[0.2] bg-white px-3 py-2 font-medium text-emerald-900"
            onClick={submit}
          >
            Finish
          </button>
        )}
      </div>
      <div className="w-[80%] rounded-lg bg-slate-200 text-black">{progressMessage}</div>
    </div>
  );
}

export default FirstRun;
