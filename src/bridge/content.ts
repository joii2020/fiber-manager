import { browser } from "wxt/browser";
import { bridgeMessageSchema } from "../schemas/messages";

export function createContentBridge() {
  let installed = false;

  function injectPageBridge() {
    const script = document.createElement("script");
    script.src = browser.runtime.getURL("/fiber-js-bridge.js");
    script.async = false;
    script.onload = () => script.remove();
    (document.documentElement || document.head).appendChild(script);
  }

  function handleWindowMessage(event: MessageEvent) {
    if (event.source !== window) {
      return;
    }

    const parsed = bridgeMessageSchema.safeParse(event.data);
    if (!parsed.success || parsed.data.type !== "fiber-manager:page-request") {
      return;
    }

    browser.runtime.sendMessage(parsed.data).then((response) => {
      window.postMessage(response, window.location.origin);
    });
  }

  return {
    install() {
      if (installed) {
        return;
      }
      installed = true;
      window.addEventListener("message", handleWindowMessage);
      injectPageBridge();
    }
  };
}
