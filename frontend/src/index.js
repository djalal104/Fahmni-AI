/**
 * index.js
 * --------
 * Entry point of the React application.
 * Mounts the <App /> component into the DOM element with id="root" (in index.html).
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
