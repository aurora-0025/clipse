import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConfigContextProvider } from "./context/ConfigContext";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConfigContextProvider>
      <App />
    </ConfigContextProvider>
  </React.StrictMode>
);


// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
