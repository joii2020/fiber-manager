import type { Runtime } from "wxt/browser";
import { browser } from "wxt/browser";
import { bridgeMessageSchema } from "../schemas/messages";

type WasmPageProbeResult = {
  title: string;
  mountPoint: string;
  hasValidMount: boolean;
  hasFiberDatabase: boolean;
  databaseNames: string[];
};

type WasmRpcResult = {
  result?: unknown;
  error?: string;
};

export function createBackgroundMessageHandler() {
  return async (message: unknown, sender: Runtime.MessageSender): Promise<unknown> => {
    const parsed = bridgeMessageSchema.safeParse(message);
    if (!parsed.success) {
      return undefined;
    }

    if (parsed.data.type === "fiber-manager:page-request") {
      return {
        type: "fiber-manager:background-response",
        requestId: parsed.data.requestId,
        result: {
          tabId: sender.tab?.id ?? null,
          accepted: true
        }
      };
    }

    if (parsed.data.type === "fiber-manager:scan-wasm-pages") {
      try {
        const { mountPoint } = parsed.data;
        const tabs = await browser.tabs.query({});
        const pages = await Promise.all(
          tabs
            .filter((tab) => typeof tab.id === "number" && isInspectablePageUrl(tab.url))
            .map(async (tab) => {
              try {
                const [probe] = await browser.scripting.executeScript({
                  target: { tabId: tab.id! },
                  world: "MAIN",
                  func: probeFiberWasmPage,
                  args: [mountPoint]
                });
                const result = probe?.result as WasmPageProbeResult | undefined;
                if (!result?.hasFiberDatabase || !tab.url) {
                  return null;
                }

                return {
                  tabId: tab.id!,
                  title: tab.title || result.title || tab.url,
                  url: tab.url,
                  mountPoint: result.mountPoint,
                  hasValidMount: result.hasValidMount,
                  hasFiberDatabase: result.hasFiberDatabase,
                  databaseNames: result.databaseNames
                };
              } catch {
                return null;
              }
            })
        );

        return {
          type: "fiber-manager:scan-wasm-pages-response",
          pages: pages
            .filter((page): page is NonNullable<(typeof pages)[number]> => page !== null)
            .sort((left, right) => Number(right.hasValidMount) - Number(left.hasValidMount))
        };
      } catch (error) {
        return {
          type: "fiber-manager:scan-wasm-pages-response",
          pages: [],
          error: error instanceof Error ? error.message : "Unable to scan browser pages"
        };
      }
    }

    if (parsed.data.type === "fiber-manager:wasm-rpc-request") {
      try {
        const tab = await findTabByUrl(parsed.data.targetPageUrl);
        if (!tab?.id) {
          throw new Error("Target WASM page is not open");
        }

        const [call] = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: callFiberWasmPage,
          args: [parsed.data.mountPoint, parsed.data.method, parsed.data.params ?? []]
        });
        const result = call?.result as WasmRpcResult | undefined;
        return {
          type: "fiber-manager:wasm-rpc-response",
          requestId: parsed.data.requestId,
          result: result?.result,
          error: result?.error
        };
      } catch (error) {
        return {
          type: "fiber-manager:wasm-rpc-response",
          requestId: parsed.data.requestId,
          error: error instanceof Error ? error.message : "Unable to call WASM page"
        };
      }
    }

    return undefined;
  };
}

async function findTabByUrl(targetPageUrl: string) {
  const tabs = await browser.tabs.query({});
  return tabs.find((tab) => tab.url === targetPageUrl);
}

function isInspectablePageUrl(url: string | undefined): url is string {
  return typeof url === "string" && /^(https?|file):/.test(url);
}

async function probeFiberWasmPage(mountPoint: string): Promise<WasmPageProbeResult> {
  function readMountPoint(path: string): unknown {
    const normalized = path.trim().replace(/^\s*(globalThis|window|self)\s*\./, "");
    if (!normalized) {
      return window;
    }

    return normalized.split(".").reduce<unknown>((target, key) => {
      if (target === null || target === undefined || !/^[A-Za-z_$][\w$]*$/.test(key)) {
        return undefined;
      }
      return (target as Record<string, unknown>)[key];
    }, window);
  }

  function listDatabases(): Promise<Array<{ name?: string }>> {
    const databases = indexedDB.databases;
    if (typeof databases !== "function") {
      return Promise.resolve([]);
    }
    return databases.call(indexedDB) as Promise<Array<{ name?: string }>>;
  }

  function isFiberDatabaseName(name: string): boolean {
    return (
      name === "/wasm/store" ||
      name === "/wasm-fiber-wallet/store" ||
      name === "/wasm-fiber-wallet-app/store" ||
      (name.endsWith("/store") && /fiber|wasm/i.test(name))
    );
  }

  async function hasMainStore(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open(name);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const db = request.result;
        const hasStore = Array.from(db.objectStoreNames).includes("main-store");
        db.close();
        resolve(hasStore);
      };
      request.onupgradeneeded = () => {
        request.transaction?.abort();
        resolve(false);
      };
    });
  }

  const databaseNames = (await listDatabases()).flatMap((database) =>
    typeof database.name === "string" && database.name.length > 0 ? [database.name] : []
  );
  const fiberDatabaseNames: string[] = [];
  for (const databaseName of databaseNames) {
    if (isFiberDatabaseName(databaseName) || (await hasMainStore(databaseName))) {
      fiberDatabaseNames.push(databaseName);
    }
  }

  const mountedValue = readMountPoint(mountPoint);
  return {
    title: document.title,
    mountPoint,
    hasValidMount:
      mountedValue !== undefined &&
      mountedValue !== null &&
      typeof (mountedValue as { start?: unknown }).start === "function",
    hasFiberDatabase: fiberDatabaseNames.length > 0,
    databaseNames: fiberDatabaseNames
  };
}

async function callFiberWasmPage(mountPoint: string, method: string, params: unknown[]): Promise<WasmRpcResult> {
  function readMountPoint(path: string): unknown {
    const normalized = path.trim().replace(/^\s*(globalThis|window|self)\s*\./, "");
    if (!normalized) {
      return window;
    }

    return normalized.split(".").reduce<unknown>((target, key) => {
      if (target === null || target === undefined || !/^[A-Za-z_$][\w$]*$/.test(key)) {
        return undefined;
      }
      return (target as Record<string, unknown>)[key];
    }, window);
  }

  function toCamelCase(value: string): string {
    return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  function normalizeResult(value: unknown): unknown {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed || !/^[\[{"]|^-?\d|^(true|false|null)$/.test(trimmed)) {
      return value;
    }

    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }

  function unwrapCommandResult(value: unknown): WasmRpcResult {
    const result = normalizeResult(value);
    if (result !== null && typeof result === "object" && !Array.isArray(result)) {
      const record = result as Record<string, unknown>;
      const error = record.error;
      if (typeof error === "string" && error.length > 0) {
        return { error };
      }
      if (error !== undefined && error !== null) {
        return { error: JSON.stringify(error) };
      }
      if ("result" in record) {
        return { result: record.result };
      }
    }

    return { result };
  }

  async function callFunction(target: unknown, name: string): Promise<WasmRpcResult | null> {
    if (target === null || typeof target !== "object") {
      return null;
    }

    const fn = (target as Record<string, unknown>)[name];
    if (typeof fn !== "function") {
      return null;
    }

    try {
      return unwrapCommandResult(await fn.apply(target, params));
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }

  const target = readMountPoint(mountPoint);
  const directMethodNames = Array.from(new Set([method, toCamelCase(method)]));
  if (target !== null && typeof target === "object") {
    const invokeCommand = (target as Record<string, unknown>).invokeCommand;
    if (typeof invokeCommand === "function") {
      try {
        return unwrapCommandResult(await invokeCommand.call(target, method, params));
      } catch (error) {
        return { error: errorMessage(error) };
      }
    }
  }

  for (const methodName of directMethodNames) {
    const result = await callFunction(target, methodName);
    if (result) {
      return result;
    }
  }

  if (target !== null && typeof target === "object") {
    const requestParams = params.length === 1 ? params[0] : params;
    for (const requestMethod of ["request", "call", "rpc"]) {
      const fn = (target as Record<string, unknown>)[requestMethod];
      if (typeof fn !== "function") {
        continue;
      }

      for (const methodName of directMethodNames) {
        try {
          return unwrapCommandResult(await fn.call(target, methodName, requestParams));
        } catch (error) {
          if (requestMethod === "rpc" || methodName === directMethodNames[directMethodNames.length - 1]) {
            return { error: errorMessage(error) };
          }
        }
      }
    }
  }

  return { error: `WASM node method ${method} is not available at ${mountPoint}` };
}
