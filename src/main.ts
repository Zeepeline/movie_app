import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

console.log("Executing main.ts - if you see this, JS is running!");

let app;
try {
  app = mount(App, {
    target: document.getElementById("app")!,
  });
  console.log("App mounted successfully!");
} catch (e) {
  console.error("Failed to mount app:", e);
  document.body.innerHTML = `<h1 style="color:red">Failed to mount app: $}</h1>`;
}

export default app;
