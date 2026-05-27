import { Plus, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { browser } from "wxt/browser";
import { bridgeMessageSchema } from "../schemas/messages";
import type { ManagedNodeInput, NodeSource } from "../schemas/managed-node";

type NodeConfigPanelProps = {
  onAddNode(node: ManagedNodeInput): void;
};

type WasmTargetPage = {
  tabId: number;
  title: string;
  url: string;
  mountPoint: string;
  hasValidMount: boolean;
  hasFiberDatabase: boolean;
  databaseNames: string[];
};

const defaultMountPoint = "window.fiber";

export function NodeConfigPanel({ onAddNode }: NodeConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<NodeSource>("fiber-rpc");
  const [name, setName] = useState("");
  const [network, setNetwork] = useState("testnet");
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:8227");
  const [authToken, setAuthToken] = useState("");
  const [targetPageUrl, setTargetPageUrl] = useState("");
  const [mountPoint, setMountPoint] = useState(defaultMountPoint);
  const [targetPages, setTargetPages] = useState<WasmTargetPage[]>([]);
  const [isScanningPages, setIsScanningPages] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim() || (source === "fiber-rpc" ? "Fiber RPC Node" : "Fiber WASM Page");
    const trimmedAuthToken = authToken.trim();
    const trimmedMountPoint = mountPoint.trim() || defaultMountPoint;

    onAddNode(
      source === "fiber-rpc"
        ? {
            name: trimmedName,
            source,
            network,
            rpcEndpoint: endpoint,
            ...(trimmedAuthToken ? { authToken: trimmedAuthToken } : {})
          }
        : {
            name: trimmedName,
            source,
            network,
            targetPageUrl,
            mountPoint: trimmedMountPoint
          }
    );
    setName("");
    setAuthToken("");
    setIsOpen(false);
  }

  async function scanTargetPages() {
    const trimmedMountPoint = mountPoint.trim() || defaultMountPoint;
    setIsScanningPages(true);
    setScanError(null);
    try {
      const response = await browser.runtime.sendMessage({
        type: "fiber-manager:scan-wasm-pages",
        mountPoint: trimmedMountPoint
      });
      const parsed = bridgeMessageSchema.safeParse(response);
      if (!parsed.success || parsed.data.type !== "fiber-manager:scan-wasm-pages-response") {
        throw new Error("Unexpected scan response");
      }

      setTargetPages(parsed.data.pages);
      if (parsed.data.pages[0]) {
        setTargetPageUrl(parsed.data.pages[0].url);
      }
      if (parsed.data.error) {
        setScanError(parsed.data.error);
      }
    } catch (error) {
      setTargetPages([]);
      setScanError(error instanceof Error ? error.message : "Unable to scan browser pages");
    } finally {
      setIsScanningPages(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-300 transition hover:border-ckb/60 hover:text-ckb"
        aria-label="Add node"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form className="w-full max-w-sm rounded-lg border border-white/10 bg-panel text-slate-100 shadow-2xl" onSubmit={submit}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Add Node</div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close add node dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-1 rounded-md bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setSource("fiber-rpc")}
                  className={source === "fiber-rpc" ? activeSegmentClassName : segmentClassName}
                >
                  RPC
                </button>
                <button
                  type="button"
                  onClick={() => setSource("fiber-wasm-page")}
                  className={source === "fiber-wasm-page" ? activeSegmentClassName : segmentClassName}
                >
                  WASM
                </button>
              </div>
              <label className="mt-3 block text-xs text-slate-400">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClassName}
                  placeholder="Node display name"
                />
              </label>
              <label className="mt-3 block text-xs text-slate-400">
                Network
                <select value={network} onChange={(event) => setNetwork(event.target.value)} className={inputClassName}>
                  <option value="mainnet">mainnet</option>
                  <option value="testnet">testnet</option>
                  <option value="devnet">devnet</option>
                </select>
              </label>
              {source === "fiber-rpc" ? (
                <>
                  <label className="mt-3 block text-xs text-slate-400">
                    RPC endpoint
                    <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} className={inputClassName} />
                  </label>
                  <label className="mt-3 block text-xs text-slate-400">
                    Auth token
                    <input
                      value={authToken}
                      onChange={(event) => setAuthToken(event.target.value)}
                      className={inputClassName}
                      type="password"
                      autoComplete="off"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="mt-3 block text-xs text-slate-400">
                    Mount point
                    <div className="mt-1 flex gap-2">
                      <input
                        value={mountPoint}
                        onChange={(event) => setMountPoint(event.target.value)}
                        className={`${inputClassName} mt-0`}
                        placeholder={defaultMountPoint}
                      />
                      <button
                        type="button"
                        onClick={scanTargetPages}
                        disabled={isScanningPages}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:border-ckb/60 hover:text-ckb disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Refresh target pages"
                        title="Refresh target pages"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isScanningPages ? "animate-spin" : ""}`} aria-hidden />
                      </button>
                    </div>
                  </label>
                  <label className="mt-3 block text-xs text-slate-400">
                    Target page
                    <select
                      value={targetPageUrl}
                      onChange={(event) => setTargetPageUrl(event.target.value)}
                      disabled={targetPages.length === 0 || isScanningPages}
                      className={inputClassName}
                    >
                      {targetPages.length === 0 ? (
                        <option value="">None</option>
                      ) : null}
                      {targetPages.map((page) => (
                        <option
                          key={`${page.tabId}:${page.url}`}
                          value={page.url}
                          className={page.hasValidMount ? "text-slate-900" : "text-slate-400"}
                        >
                          {page.title || "Untitled page"} - {page.url}
                        </option>
                      ))}
                    </select>
                  </label>
                  {targetPages.length === 0 ? (
                    <div className="mt-2 text-xs text-slate-500">
                      {isScanningPages ? "Scanning pages..." : "Click refresh to scan current browser pages."}
                    </div>
                  ) : null}
                  {scanError ? <div className="mt-2 text-xs text-red-300">{scanError}</div> : null}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-9 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={source === "fiber-wasm-page" && !targetPageUrl}
                className="h-9 rounded-md bg-ckb px-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

const segmentClassName = "h-8 rounded text-xs font-medium text-slate-400";
const activeSegmentClassName = "h-8 rounded bg-white text-xs font-semibold text-slate-900";
const inputClassName =
  "mt-1 h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white outline-none focus:border-ckb";
