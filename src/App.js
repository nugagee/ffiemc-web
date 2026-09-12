import React from "react";
import "./assets/css/App.css";
import AllPages from "./routes/routes";
import useVersionCheck from "./hooks/useVersionCheck";

function App() {
  useVersionCheck();
  return <AllPages />;
}

export default App;
