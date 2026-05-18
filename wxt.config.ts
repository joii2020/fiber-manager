import { defineConfig } from "wxt";
import { fileURLToPath } from "node:url";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  outDir: "dist",
  vite: () => ({
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    }
  }),
  manifest: {
    name: "Fiber Manager",
    description: "Developer console for managing Fiber nodes from a browser extension.",
    version: "0.1.0",
    permissions: ["storage", "tabs", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Open Fiber Manager"
    },
    web_accessible_resources: [
      {
        resources: ["fiber-js-bridge.js"],
        matches: ["<all_urls>"]
      }
    ],
    browser_specific_settings: {
      gecko: {
        id: "fiber-manager@example.local"
      }
    }
  }
});
