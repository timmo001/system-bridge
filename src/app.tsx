import * as React from "react";
import * as ReactDOM from "react-dom";
import "fontsource-roboto";

import App from "./settings/App";
import "./index.css";

function render() {
  ReactDOM.render(<App />, document.getElementById("root"));
}

render();
