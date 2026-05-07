import { browser } from "wxt/browser";
import { createBackgroundMessageHandler } from "../src/bridge/background";

export default defineBackground(() => {
  browser.action.onClicked.addListener(async () => {
    const managerUrl = browser.runtime.getURL("/manager.html");
    const tabs = await browser.tabs.query({ url: managerUrl });
    const existingTab = tabs[0];

    if (existingTab?.id) {
      await browser.tabs.update(existingTab.id, { active: true });
      if (existingTab.windowId) {
        await browser.windows.update(existingTab.windowId, { focused: true });
      }
      return;
    }

    await browser.tabs.create({ url: managerUrl });
  });

  browser.runtime.onMessage.addListener(createBackgroundMessageHandler());
});
