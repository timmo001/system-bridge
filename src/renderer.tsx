import React from "react";
import ReactDOM from "react-dom";
import { hot } from "react-hot-loader";
import "fontsource-roboto";

import App from "./settings/App";
import "./index.css";

ReactDOM.render(<App />, document.getElementById("root"));

export default hot(module)(App);
