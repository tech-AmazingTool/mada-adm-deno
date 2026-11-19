import { render } from "preact";
// Import CSS files here for hot module reloading to work.
import App from "@/App.tsx";
import "./assets/styles.css";

render(<App />, document.getElementById("app")!);
