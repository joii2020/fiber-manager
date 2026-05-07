import { createContentBridge } from "../src/bridge/content";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  main() {
    createContentBridge().install();
  }
});
