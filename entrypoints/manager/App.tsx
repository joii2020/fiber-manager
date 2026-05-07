import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Coins,
  FileJson,
  GitBranch,
  Globe2,
  Layers3,
  Network,
  Plus,
  RadioTower,
  ReceiptText,
  RefreshCw,
  Route,
  Server,
  Shield,
  WifiOff,
  X
} from "lucide-react";
import { type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  acceptChannel,
  connectPeer,
  disconnectPeer,
  graphChannels as loadGraphChannels,
  graphNodes as loadGraphNodes,
  listChannels,
  listPayments,
  listPeers,
  normalizeRpcList,
  cancelInvoice,
  getInvoice,
  getPayment,
  newInvoice,
  openChannel,
  parseInvoice,
  refreshNode,
  refreshNodes,
  sendPayment,
  shutdownChannel
} from "../../src/node/fiber-api";
import type { AcceptChannelParams, OpenChannelParams, Script } from "../../src/node/fiber-client";
import type { ManagedNode } from "../../src/schemas/managed-node";
import { createExtensionStorage } from "../../src/store/extension-storage";
import type { StoredInvoiceHistoryItem } from "../../src/store/extension-storage";
import { NodeConfigPanel } from "../../src/ui/NodeConfigPanel";
import { PubkeySelectField } from "../../src/ui/PubkeySelectField";
import { StatusPill } from "../../src/ui/StatusPill";
import { useManagedNodeRegistry } from "../../src/ui/useManagedNodeRegistry";
import {
  readWorkspaceSectionFromHash,
  workspaceSections,
  writeWorkspaceSectionHash,
  type WorkspaceSection
} from "../../src/ui/workspace-routing";

const storage = createExtensionStorage();

export function ManagerApp() {
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>(() => readWorkspaceSectionFromHash());
  const {
    nodes,
    activeNode,
    activeNodeId,
    isReady,
    isRefreshing,
    addNode,
    selectNode,
    refreshAll,
    reorderNodes,
    updateActiveNode
  } = useManagedNodeRegistry(storage);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dragOverPlacement, setDragOverPlacement] = useState<"before" | "after">("before");
  const lastDragEndedAtRef = useRef(0);

  useEffect(() => {
    function handleHashChange() {
      setWorkspaceSection(readWorkspaceSectionFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function handleWorkspaceSectionChange(section: WorkspaceSection) {
    setWorkspaceSection(section);
    writeWorkspaceSectionHash(section);
  }

  function handleNodeSelect(nodeId: string) {
    if (Date.now() - lastDragEndedAtRef.current < 200) {
      return;
    }
    selectNode(nodeId);
  }

  function handleNodeKeyDown(event: KeyboardEvent<HTMLDivElement>, nodeId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleNodeSelect(nodeId);
  }

  function getDropPlacement(event: DragEvent<HTMLElement>): "before" | "after" {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  function handleNodeDragStart(event: DragEvent<HTMLDivElement>, nodeId: string) {
    setDraggedNodeId(nodeId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", nodeId);
  }

  function handleNodeDragOver(event: DragEvent<HTMLDivElement>, nodeId: string) {
    if (draggedNodeId === nodeId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverNodeId(nodeId);
    setDragOverPlacement(getDropPlacement(event));
  }

  async function handleNodeDrop(event: DragEvent<HTMLDivElement>, targetNodeId: string) {
    event.preventDefault();
    const sourceNodeId = event.dataTransfer.getData("text/plain") || draggedNodeId;
    lastDragEndedAtRef.current = Date.now();
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    if (!sourceNodeId || sourceNodeId === targetNodeId) return;
    await reorderNodes(sourceNodeId, targetNodeId, getDropPlacement(event));
  }

  function handleNodeDragEnd() {
    lastDragEndedAtRef.current = Date.now();
    setDraggedNodeId(null);
    setDragOverNodeId(null);
  }

  if (!isReady) {
    return (
      <main className="flex h-screen min-h-[560px] items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-sm text-slate-400">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex h-screen min-h-[560px] bg-slate-950 text-slate-100">
      <aside className="flex w-[312px] shrink-0 flex-col border-r border-line bg-panel text-slate-100">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <RadioTower className="h-5 w-5 text-ckb" aria-hidden />
            <h1 className="text-base font-semibold">Fiber Manager</h1>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            <span>Managed Nodes</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshAll}
                disabled={isRefreshing || nodes.length === 0}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-300 transition hover:border-ckb/60 hover:text-ckb disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Refresh all nodes"
                title="Refresh all nodes"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
              </button>
              <NodeConfigPanel onAddNode={addNode} />
              <span>{nodes.length}</span>
            </div>
          </div>
          <div className="space-y-2">
            {nodes.map((node) => (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                onClick={() => handleNodeSelect(node.id)}
                onKeyDown={(event) => handleNodeKeyDown(event, node.id)}
                onDragOver={(event) => handleNodeDragOver(event, node.id)}
                onDragLeave={() => setDragOverNodeId((current) => (current === node.id ? null : current))}
                onDrop={(event) => handleNodeDrop(event, node.id)}
                className={[
                  "relative w-full cursor-pointer rounded-md border px-3 py-3 text-left transition",
                  draggedNodeId === node.id ? "opacity-50" : "",
                  node.id === activeNodeId
                    ? "border-ckb/70 bg-ckb/10 shadow-[inset_3px_0_0_#00c891]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                ].join(" ")}
              >
                {dragOverNodeId === node.id ? (
                  <div
                    className={[
                      "pointer-events-none absolute left-3 right-3 h-0.5 rounded-full bg-ckb",
                      dragOverPlacement === "before" ? "top-0" : "bottom-0"
                    ].join(" ")}
                  />
                ) : null}
                <div className="flex items-start gap-3">
                  <NodeTypeIcon
                    node={node}
                    draggable
                    onDragStart={(event) => handleNodeDragStart(event, node.id)}
                    onDragEnd={handleNodeDragEnd}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-white" title={node.name}>{node.name}</div>
                      <span className="shrink-0 text-xs text-slate-400">ver: {nodeVersionLabel(node)}</span>
                    </div>
                    {node.pubkey && node.status === "connected" ? (
                      <div className="mt-1 truncate text-xs text-slate-400 font-mono" title={node.pubkey}>
                        pubkey: {node.pubkey.slice(0, 20)}…{node.pubkey.slice(-12)}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-400">
                        pubkey: n/a
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill status={node.status} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-panel px-5">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-ckb" aria-hidden />
            <h2 className="text-sm font-semibold">Fiber Management Workspace</h2>
          </div>
          {activeNode ? <StatusPill status={activeNode.status} /> : null}
        </div>

        <Workspace
          nodes={nodes}
          activeNode={activeNode}
          section={workspaceSection}
          onActiveNodeChange={updateActiveNode}
          onSectionChange={handleWorkspaceSectionChange}
        />

        <StatusBar activeNode={activeNode} />
      </section>
    </main>
  );
}

function NodeTypeIcon({
  node,
  draggable,
  onDragStart,
  onDragEnd
}: {
  node: ManagedNode;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}) {
  const Icon = node.source === "fiber-rpc" ? Server : Globe2;
  return (
    <div
      draggable={draggable}
      onClick={(event) => draggable ? event.stopPropagation() : undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/8 text-ckb",
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      ].join(" ")}
      aria-label={draggable ? `Drag ${node.name}` : undefined}
      title={draggable ? "Drag to reorder" : undefined}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </div>
  );
}

type OpenChannelFormState = {
  pubkey: string;
  funding_amount: string;
  public: boolean;
  one_way: boolean;
  funding_udt_type_script: string;
  shutdown_script: string;
  commitment_delay_epoch: string;
  commitment_fee_rate: string;
  funding_fee_rate: string;
  tlc_expiry_delta: string;
  tlc_min_value: string;
  tlc_fee_proportional_millionths: string;
  max_tlc_value_in_flight: string;
  max_tlc_number_in_flight: string;
};

type SendPaymentFormState = {
  invoice: string;
  target_pubkey: string;
  amount: string;
  max_fee_amount: string;
  timeout: string;
  keysend: boolean;
  dry_run: boolean;
};

type NewInvoiceFormState = {
  amount: string;
  description: string;
  currency: string;
  expiry: string;
  allow_mpp: boolean;
  allow_trampoline: boolean;
};

const PEERS_PAGE_SIZE = 20;
const GRAPH_PAGE_SIZE = 10;
const CKB_SHANNONS = 100000000n;
const CKB_INVOICE_CURRENCIES = new Set(["ckb", "fibb", "fibt", "fibd"]);

const defaultOpenChannelForm: OpenChannelFormState = {
  pubkey: "",
  funding_amount: "",
  public: true,
  one_way: false,
  funding_udt_type_script: "",
  shutdown_script: "",
  commitment_delay_epoch: "",
  commitment_fee_rate: "",
  funding_fee_rate: "",
  tlc_expiry_delta: "",
  tlc_min_value: "",
  tlc_fee_proportional_millionths: "",
  max_tlc_value_in_flight: "",
  max_tlc_number_in_flight: ""
};

const defaultSendPaymentForm: SendPaymentFormState = {
  invoice: "",
  target_pubkey: "",
  amount: "",
  max_fee_amount: "",
  timeout: "",
  keysend: false,
  dry_run: false
};

const defaultNewInvoiceForm: NewInvoiceFormState = {
  amount: "",
  description: "",
  currency: "",
  expiry: "",
  allow_mpp: false,
  allow_trampoline: false
};

function Workspace({
  nodes,
  activeNode,
  section,
  onActiveNodeChange,
  onSectionChange
}: {
  nodes: ManagedNode[];
  activeNode: ManagedNode | null;
  section: WorkspaceSection;
  onActiveNodeChange(node: ManagedNode): Promise<void>;
  onSectionChange(section: WorkspaceSection): void;
}) {
  if (!activeNode) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-950">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <WifiOff className="h-4 w-4" aria-hidden />
          No active node
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-950">
      <nav className="flex h-11 shrink-0 items-center gap-1 border-b border-white/10 bg-slate-900/70 px-4">
        {workspaceSections.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === section;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={[
                "flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition",
                isActive
                  ? "bg-ckb text-slate-950"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-1">
        <div className="min-h-0 overflow-y-auto p-4">
          {section === "overview" ? <OverviewCanvas key={activeNode.id} activeNode={activeNode} /> : null}
          {section === "network" ? (
            <NetworkCanvas key={activeNode.id} nodes={nodes} activeNode={activeNode} onActiveNodeChange={onActiveNodeChange} />
          ) : null}
          {section === "channels" ? (
            <ChannelsCanvas key={activeNode.id} nodes={nodes} activeNode={activeNode} onActiveNodeChange={onActiveNodeChange} />
          ) : null}
          {section === "payments" ? (
            <PaymentsCanvas
              key={activeNode.id}
              nodes={nodes}
              activeNode={activeNode}
              onActiveNodeChange={onActiveNodeChange}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OverviewCanvas({ activeNode }: { activeNode: ManagedNode }) {
  const nodeInfo = unwrapNodeInfo(activeNode.rpc?.nodeInfo);
  const lockScript = toRecord(nodeInfo?.default_funding_lock_script);
  const peersCount = readCount(nodeInfo, ["peers_count", "peersCount"], activeNode.rpc?.peers?.length);
  const channelCount = readCount(nodeInfo, ["channel_count", "channelCount"], activeNode.rpc?.channels?.length);
  const pendingChannelCount = readCount(nodeInfo, ["pending_channel_count", "pendingChannelCount"]);
  const paymentsCount = activeNode.rpc?.payments?.length ?? 0;

  const explorerBase = activeNode.network?.toLowerCase().includes("test") || activeNode.network?.toLowerCase().includes("pudge")
    ? "https://pudge.explorer.nervos.org"
    : "https://explorer.nervos.org";
  const explorerUrl = lockScript?.code_hash && lockScript?.hash_type
    ? `${explorerBase}/script/${lockScript.code_hash}/${lockScript.hash_type}`
    : null;

  const fundingRows: Array<[string, React.ReactNode, boolean?]> = [
    ...(lockScript
      ? [
        ["code_hash", formatValue(lockScript.code_hash)] as [string, React.ReactNode, boolean?],
        ["hash_type", formatValue(lockScript.hash_type), true] as [string, React.ReactNode, boolean?],
        ["args", formatValue(lockScript.args)] as [string, React.ReactNode, boolean?],
        ...(explorerUrl
          ? [["Script Cell", <a key="script-cell" href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-ckb hover:underline">view Script Cell ↗</a>, true] as [string, React.ReactNode, boolean?]]
          : [])
      ]
      : nodeInfo?.default_funding_lock_script !== undefined
        ? [["default_funding_lock_script", formatValue(nodeInfo.default_funding_lock_script), true] as [string, React.ReactNode, boolean?]]
        : []),
    ...(nodeInfo?.funding !== undefined
      ? [["funding", formatValue(nodeInfo.funding), true] as [string, React.ReactNode, boolean?]]
      : []),

  ];

  const udtConfig = pickArray(nodeInfo, ["udt_cfg_infos", "udt_configs", "udtCfgInfos"]);
  const rpcRows: Array<[string, React.ReactNode, boolean?]> = [
    ["last refresh", formatLocalRefreshTime(activeNode.rpc?.refreshedAt) ?? "not refreshed"],
    ["last rpc", formatLastRpcLabel(activeNode)],
    ["last rpc status", activeNode.rpc?.lastStatus ?? "idle"],
    ["node_info", rpcLoadStatus(activeNode.rpc?.nodeInfo)],
    ["list_peers", rpcLoadStatus(activeNode.rpc?.peers)],
    ["list_channels", rpcLoadStatus(activeNode.rpc?.channels)],
    ["list_payments", rpcLoadStatus(activeNode.rpc?.payments)],
    ["graph_nodes", rpcLoadStatus(activeNode.rpc?.graphNodes)],
    ["graph_channels", rpcLoadStatus(activeNode.rpc?.graphChannels)],
    ["rpc errors", formatRpcErrors(activeNode), true]
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <MetricStrip
        items={[
          ["peers", String(peersCount)],
          ["channels", String(channelCount)],
          ["pending", String(pendingChannelCount)],
          ["payments", String(paymentsCount)]
        ]}
      />
      <DensePanel title="Node Identity" icon={Server} className="xl:col-span-2">
        <div className="grid gap-3 lg:grid-cols-2">
          <CompactRows
            rows={[
              ["name", activeNode.name],
              ["node name", formatValue(nodeInfo?.node_name ?? nodeInfo?.nodeName)],
              ["network", activeNode.network],
              ["pubkey", activeNode.pubkey ?? "not loaded"],
              ["endpoint", nodeEndpoint(activeNode), true]
            ]}
          />
          <CompactRows
            rows={[
              ["version", formatValue(nodeInfo?.version)],
              ["commit", formatValue(nodeInfo?.commit_hash ?? nodeInfo?.commitHash)],
              ["chain", formatValue(nodeInfo?.chain_hash ?? nodeInfo?.chainHash ?? nodeInfo?.chain)],
              ["features", formatValue(nodeInfo?.features), true],
              ["connect ports", formatConnectionPorts(nodeInfo), true],
              ["addresses", formatAddressList(nodeInfo?.addresses), true]
            ]}
          />
        </div>
      </DensePanel>
      <DensePanel title="RPC Status" icon={RefreshCw}>
        <CompactRows rows={rpcRows} />
      </DensePanel>
      <DensePanel title="Funding Defaults" icon={Shield}>
        <CompactRows rows={fundingRows.length ? fundingRows : [["funding defaults", "No data returned"]]} />
      </DensePanel>
      <DensePanel title="Routing Policy" icon={Route}>
        <CompactRows
          rows={[
            ["auto accept min", formatCkbAmount(nodeInfo?.open_channel_auto_accept_min_ckb_funding_amount ?? nodeInfo?.auto_accept_min_ckb_funding_amount)],
            ["auto accept", formatCkbAmount(nodeInfo?.auto_accept_channel_ckb_funding_amount)],
            ["tlc expiry", formatValue(nodeInfo?.tlc_expiry_delta)],
            ["tlc min value", formatValue(nodeInfo?.tlc_min_value)],
            ["tlc fee ppm", formatValue(nodeInfo?.tlc_fee_proportional_millionths)]
          ]}
        />
      </DensePanel>
      <DensePanel title="UDT Config" icon={FileJson}>
        <DataTable
          columns={["name", "auto accept", "script", "deps"]}
          rows={udtConfig.map((item) => {
            const row = toRecord(item);
            return [
              formatValue(row?.name ?? row?.symbol ?? "UDT"),
              formatValue(row?.auto_accept_amount ?? row?.autoAcceptAmount ?? row?.auto_accept),
              formatValue(row?.script),
              formatValue(row?.cell_deps ?? row?.cellDeps)
            ];
          })}
          emptyText="No UDT config returned by node_info"
        />
      </DensePanel>
    </div>
  );
}

function NetworkCanvas({
  nodes,
  activeNode,
  onActiveNodeChange
}: {
  nodes: ManagedNode[];
  activeNode: ManagedNode;
  onActiveNodeChange(node: ManagedNode): Promise<void>;
}) {
  const peers = activeNode.rpc?.peers ?? [];
  const graphNodes = activeNode.rpc?.graphNodes ?? [];
  const graphChannels = activeNode.rpc?.graphChannels ?? [];
  const [peersPage, setPeersPage] = useState(1);
  const [graphNodesPage, setGraphNodesPage] = useState(1);
  const [graphChannelsPage, setGraphChannelsPage] = useState(1);
  const [expandedGraphPanel, setExpandedGraphPanel] = useState<"nodes" | "channels" | null>(null);
  const [isConnectPeerOpen, setIsConnectPeerOpen] = useState(false);
  const [connectPeerAddress, setConnectPeerAddress] = useState("");
  const [connectPeerNodeId, setConnectPeerNodeId] = useState("");
  const [connectPeerError, setConnectPeerError] = useState<string | null>(null);
  const [disconnectPeerTarget, setDisconnectPeerTarget] = useState<{ pubkey: string; label: string } | null>(null);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);
  const [pendingNetworkActions, setPendingNetworkActions] = useState<string[]>([]);
  const isConnectPeerPending = pendingNetworkActions.includes("connect_peer");
  const isListPeersPending = pendingNetworkActions.includes("list_peers");
  const isDisconnectPeerPending = pendingNetworkActions.includes("disconnect_peer");
  const isGraphNodesPending = pendingNetworkActions.includes("graph_nodes");
  const isGraphChannelsPending = pendingNetworkActions.includes("graph_channels");
  const connectPeerNodeOptions = nodes.filter((node) => (
    node.id !== activeNode.id &&
    node.source === "fiber-rpc" &&
    node.status === "connected"
  ));

  useEffect(() => {
    setPeersPage(1);
    setGraphNodesPage(1);
    setGraphChannelsPage(1);
    setExpandedGraphPanel(null);
  }, [activeNode.id]);

  useEffect(() => {
    setPeersPage((page) => clampPage(page, peers.length, PEERS_PAGE_SIZE));
  }, [peers.length]);

  useEffect(() => {
    setGraphNodesPage((page) => clampPage(page, graphNodes.length, GRAPH_PAGE_SIZE));
  }, [graphNodes.length]);

  useEffect(() => {
    setGraphChannelsPage((page) => clampPage(page, graphChannels.length, GRAPH_PAGE_SIZE));
  }, [graphChannels.length]);

  const graphNodeRows = graphNodes.map((node) => {
    const row = toRecord(node);
    return [
      formatValue(row?.alias ?? row?.name ?? row?.node_name),
      shorten(formatValue(row?.pubkey ?? row?.node_id)),
      countOrValue(row?.addresses),
      formatValue(row?.features)
    ];
  });

  const graphChannelRows = graphChannels.map((channel) => {
    const row = toRecord(channel);
    return [
      shorten(formatValue(row?.outpoint ?? row?.channel_outpoint ?? row?.channel_id)),
      shorten(formatValue(row?.node1 ?? row?.node1_pubkey)),
      shorten(formatValue(row?.node2 ?? row?.node2_pubkey)),
      formatCkbAmount(row?.capacity ?? row?.funding_amount),
      formatValue(row?.enabled)
    ];
  });

  const peerRows = peers.map((peer) => {
    const row = toRecord(peer);
    return [
      formatValue(row?.pubkey ?? row?.node_id ?? row?.peer_id),
      formatValue(row?.address ?? row?.addresses ?? row?.connected_addr),
      formatValue(row?.transport ?? row?.addr_type),
      <button
        type="button"
        onClick={() => void handleDisconnectPeer(peer)}
        disabled={isDisconnectPeerPending}
        className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-400/70 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Disconnect peer"
        title="Disconnect peer"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    ];
  });

  async function runFiberNodeAction(
    action: string,
    operation: () => Promise<void>,
    options: { onError?(message: string): void } = {}
  ): Promise<ManagedNode | null> {
    beginNetworkAction(action);
    const pendingNode = markRpcCall(activeNode, action, "pending");
    await onActiveNodeChange(pendingNode);
    try {
      await operation();
      const refreshed = await refreshNode(activeNode);
      const updatedNode = markRpcCall(refreshed, action, "success");
      await onActiveNodeChange(updatedNode);
      return updatedNode;
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      await onActiveNodeChange(markRpcCall(pendingNode, action, "error", message));
      if (options.onError) {
        options.onError(message);
      } else {
        setNetworkNotice(message);
      }
      return null;
    } finally {
      endNetworkAction(action);
    }
  }

  function beginNetworkAction(action: string) {
    setPendingNetworkActions((actions) => (actions.includes(action) ? actions : [...actions, action]));
  }

  function endNetworkAction(action: string) {
    setPendingNetworkActions((actions) => actions.filter((pendingAction) => pendingAction !== action));
  }

  function handleConnectPeer() {
    setConnectPeerError(null);
    setIsConnectPeerOpen(true);
  }

  function closeConnectPeerDialog() {
    setConnectPeerAddress("");
    setConnectPeerNodeId("");
    setConnectPeerError(null);
    setIsConnectPeerOpen(false);
  }

  function updateConnectPeerAddress(value: string) {
    setConnectPeerAddress(value.replace(/[\r\n]+/g, " "));
    setConnectPeerNodeId("");
    setConnectPeerError(null);
  }

  function selectConnectPeerNode(nodeId: string) {
    setConnectPeerNodeId(nodeId);
    setConnectPeerError(null);
    if (!nodeId) {
      return;
    }

    const selectedNode = connectPeerNodeOptions.find((node) => node.id === nodeId);
    if (!selectedNode) {
      setConnectPeerError("Selected node is unavailable.");
      return;
    }

    const address = readConnectPeerAddress(selectedNode, activeNode.source);
    if (!address) {
      setConnectPeerAddress("");
      setConnectPeerError(
        activeNode.source === "fiber-rpc"
          ? `${selectedNode.name} has no non-ws/wss address.`
          : `${selectedNode.name} has no ws/wss address.`
      );
      return;
    }

    setConnectPeerAddress(address);
  }

  async function submitConnectPeer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedAddress = connectPeerAddress.trim();
    if (!trimmedAddress) return;

    setConnectPeerError(null);
    const connectedNode = await runFiberNodeAction(
      "connect_peer",
      () => connectPeer(activeNode, { address: trimmedAddress }),
      {
        onError: setConnectPeerError
      }
    );
    if (connectedNode) {
      closeConnectPeerDialog();
      await refreshConnectedPeers(connectedNode);
    }
  }

  async function handleListPeers() {
    await refreshConnectedPeers(activeNode);
  }

  async function refreshConnectedPeers(targetNode: ManagedNode) {
    setNetworkNotice(null);
    beginNetworkAction("list_peers");
    const pendingNode = markRpcCall(targetNode, "list_peers", "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await listPeers(targetNode);
      await onActiveNodeChange(markRpcCall({
        ...pendingNode,
        rpc: {
          ...pendingNode.rpc,
          refreshedAt: new Date().toISOString(),
          peers: normalizeRpcList(result, "peers"),
          errors: omitRpcError(pendingNode.rpc?.errors, "list_peers")
        }
      }, "list_peers", "success"));
      setPeersPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "list_peers failed";
      await onActiveNodeChange(markRpcCall(pendingNode, "list_peers", "error", message));
      setNetworkNotice(message);
    } finally {
      endNetworkAction("list_peers");
    }
  }

  async function handleGraphNodes() {
    setNetworkNotice(null);
    beginNetworkAction("graph_nodes");
    const pendingNode = markRpcCall(activeNode, "graph_nodes", "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await loadGraphNodes(activeNode, { limit: null, after: null });
      await onActiveNodeChange(markRpcCall({
        ...pendingNode,
        rpc: {
          ...pendingNode.rpc,
          refreshedAt: new Date().toISOString(),
          graphNodes: normalizeRpcList(result, "graphNodes"),
          errors: omitRpcError(pendingNode.rpc?.errors, "graph_nodes")
        }
      }, "graph_nodes", "success"));
      setGraphNodesPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "graph_nodes failed";
      await onActiveNodeChange(markRpcCall(pendingNode, "graph_nodes", "error", message));
      setNetworkNotice(message);
    } finally {
      endNetworkAction("graph_nodes");
    }
  }

  async function handleGraphChannels() {
    setNetworkNotice(null);
    beginNetworkAction("graph_channels");
    const pendingNode = markRpcCall(activeNode, "graph_channels", "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await loadGraphChannels(activeNode, { limit: null, after: null });
      await onActiveNodeChange(markRpcCall({
        ...pendingNode,
        rpc: {
          ...pendingNode.rpc,
          refreshedAt: new Date().toISOString(),
          graphChannels: normalizeRpcList(result, "graphChannels"),
          errors: omitRpcError(pendingNode.rpc?.errors, "graph_channels")
        }
      }, "graph_channels", "success"));
      setGraphChannelsPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "graph_channels failed";
      await onActiveNodeChange(markRpcCall(pendingNode, "graph_channels", "error", message));
      setNetworkNotice(message);
    } finally {
      endNetworkAction("graph_channels");
    }
  }

  async function handleDisconnectPeer(peer: unknown) {
    const row = toRecord(peer);
    const pubkey = formatValue(row?.pubkey ?? row?.node_id ?? row?.peer_id);
    if (!pubkey || pubkey === "n/a") {
      setNetworkNotice("Peer pubkey is unavailable.");
      return;
    }

    setNetworkNotice(null);
    setDisconnectPeerTarget({ pubkey, label: shorten(pubkey) });
  }

  async function confirmDisconnectPeer() {
    if (!disconnectPeerTarget) return;

    const target = disconnectPeerTarget;
    setDisconnectPeerTarget(null);
    await runFiberNodeAction("disconnect_peer", () => disconnectPeer(activeNode, { pubkey: target.pubkey }));
  }

  return (
    <>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="grid min-w-0 gap-3">
          <MetricStrip
            items={[
              ["peers", String(peers.length)],
              ["graph nodes", String(graphNodes.length)],
              ["graph channels", String(graphChannels.length)]
            ]}
          />
          <DensePanel
            title="Connected Peers"
            icon={Network}
            count={peers.length}
            headerAction={{
              label: "Refresh connected peers",
              onClick: handleListPeers,
              disabled: isListPeersPending,
              isPending: isListPeersPending
            }}
            headerActions={[
              {
                label: "connect_peer",
                onClick: handleConnectPeer,
                disabled: isConnectPeerPending,
                icon: Plus
              }
            ]}
          >
            {networkNotice ? (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1 break-words">{networkNotice}</div>
                <button
                  type="button"
                  onClick={() => setNetworkNotice(null)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-red-200/70 hover:bg-red-400/10 hover:text-red-100"
                  aria-label="Dismiss network notice"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ) : null}
            <PaginatedDataTable
              columns={["pubkey", "address", "transport", "action"]}
              rows={peerRows}
              emptyText="No peers returned by list_peers"
              page={peersPage}
              pageSize={PEERS_PAGE_SIZE}
              onPageChange={setPeersPage}
            />
          </DensePanel>
        </div>

        <div className="grid min-w-0 gap-3">
          <CollapsibleGraphPanel
            title="Graph Nodes"
            icon={GitBranch}
            count={graphNodes.length}
            isOpen={expandedGraphPanel === "nodes"}
            onToggle={() => setExpandedGraphPanel((panel) => (panel === "nodes" ? null : "nodes"))}
            headerAction={{
              label: "Refresh graph nodes",
              onClick: handleGraphNodes,
              disabled: isGraphNodesPending,
              isPending: isGraphNodesPending
            }}
          >
            <PaginatedDataTable
              columns={["node", "pubkey", "addresses", "features"]}
              rows={graphNodeRows}
              emptyText="No graph nodes returned"
              page={graphNodesPage}
              pageSize={GRAPH_PAGE_SIZE}
              onPageChange={setGraphNodesPage}
            />
          </CollapsibleGraphPanel>
          <CollapsibleGraphPanel
            title="Graph Channels"
            icon={Route}
            count={graphChannels.length}
            isOpen={expandedGraphPanel === "channels"}
            onToggle={() => setExpandedGraphPanel((panel) => (panel === "channels" ? null : "channels"))}
            headerAction={{
              label: "Refresh graph channels",
              onClick: handleGraphChannels,
              disabled: isGraphChannelsPending,
              isPending: isGraphChannelsPending
            }}
          >
            <PaginatedDataTable
              columns={["outpoint", "node1", "node2", "CKB amount", "enabled"]}
              rows={graphChannelRows}
              emptyText="No graph channels returned"
              page={graphChannelsPage}
              pageSize={GRAPH_PAGE_SIZE}
              onPageChange={setGraphChannelsPage}
            />
          </CollapsibleGraphPanel>
        </div>
      </div>

      {isConnectPeerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form className="w-full max-w-md rounded-lg border border-white/10 bg-panel text-slate-100 shadow-2xl" onSubmit={submitConnectPeer}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Connect Peer</div>
              <button
                type="button"
                onClick={closeConnectPeerDialog}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close connect peer dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="p-4">
              <label className="block text-xs text-slate-400">
                Address
                <textarea
                  autoFocus
                  value={connectPeerAddress}
                  onChange={(event) => updateConnectPeerAddress(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                  placeholder="/ip4/127.0.0.1/tcp/8119/p2p/..."
                  className={[
                    "mt-1 h-16 w-full resize-none rounded-md border bg-white/5 px-2 py-2 text-sm text-white outline-none focus:border-ckb",
                    connectPeerError ? "border-red-400/70" : "border-white/10"
                  ].join(" ")}
                />
              </label>
              <label className="mt-3 block text-xs text-slate-400">
                Managed RPC node
                <select
                  value={connectPeerNodeId}
                  onChange={(event) => selectConnectPeerNode(event.target.value)}
                  disabled={connectPeerNodeOptions.length === 0}
                  className={[
                    "mt-1 h-8 w-full rounded-md border bg-white/5 px-2 text-sm text-white outline-none focus:border-ckb",
                    connectPeerError ? "border-red-400/70" : "border-white/10"
                  ].join(" ")}
                >
                  <option value="">Select connected RPC node</option>
                  {connectPeerNodeOptions.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </label>
              {connectPeerNodeOptions.length === 0 ? (
                <div className="mt-2 text-xs text-slate-500">No other connected RPC nodes available.</div>
              ) : null}
              {connectPeerError ? (
                <div className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {connectPeerError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={closeConnectPeerDialog}
                className="h-9 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnectPeerPending || connectPeerAddress.trim().length === 0}
                className="h-9 rounded-md bg-ckb px-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {disconnectPeerTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-panel text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Disconnect Peer</div>
              <button
                type="button"
                onClick={() => setDisconnectPeerTarget(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close disconnect peer dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-start gap-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <div className="font-semibold text-red-100">Confirm disconnect_peer?</div>
                  <div className="mt-1 break-all font-mono text-xs text-red-100/80">{disconnectPeerTarget.label}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setDisconnectPeerTarget(null)}
                className="h-9 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDisconnectPeer()}
                disabled={isDisconnectPeerPending}
                className="h-9 rounded-md bg-red-400 px-3 text-sm font-semibold text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ChannelsCanvas({
  nodes,
  activeNode,
  onActiveNodeChange
}: {
  nodes: ManagedNode[];
  activeNode: ManagedNode;
  onActiveNodeChange(node: ManagedNode): Promise<void>;
}) {
  const channels = activeNode.rpc?.channels ?? [];
  const [channelsPage, setChannelsPage] = useState(1);
  const [channelNotice, setChannelNotice] = useState<string | null>(null);
  const [channelNoticeKind, setChannelNoticeKind] = useState<"error" | "success">("error");
  const [isOpenChannelOpen, setIsOpenChannelOpen] = useState(false);
  const [openChannelForm, setOpenChannelForm] = useState<OpenChannelFormState>(defaultOpenChannelForm);
  const [openChannelError, setOpenChannelError] = useState<string | null>(null);
  const [shutdownChannelTarget, setShutdownChannelTarget] = useState<{ channelId: string; label: string } | null>(null);
  const [acceptChannelTarget, setAcceptChannelTarget] = useState<{ temporaryChannelId: string; label: string } | null>(null);
  const [acceptChannelFundingAmount, setAcceptChannelFundingAmount] = useState("");
  const [acceptChannelError, setAcceptChannelError] = useState<string | null>(null);
  const [pendingRequestChannels, setPendingRequestChannels] = useState<unknown[]>([]);
  const [closedChannels, setClosedChannels] = useState<unknown[]>([]);
  const [closedChannelsPage, setClosedChannelsPage] = useState(1);
  const [pendingChannelActions, setPendingChannelActions] = useState<string[]>([]);
  const activeChannels = channels.filter((channel) => !isPendingChannel(channel) && !isClosedChannel(channel));
  const pendingChannels = mergeChannelsById(pendingRequestChannels, channels.filter(isPendingChannel));
  const tlcs = channels.flatMap((channel) => {
    const row = toRecord(channel);
    const pendingTlcs = Array.isArray(row?.tlcs) ? row.tlcs : Array.isArray(row?.pending_tlcs) ? row.pending_tlcs : [];
    return pendingTlcs;
  });
  const isListChannelsPending = pendingChannelActions.includes("list_channels");
  const isListPendingChannelsPending = pendingChannelActions.includes("list_pending_channels");
  const isListClosedChannelsPending = pendingChannelActions.includes("list_closed_channels");
  const isOpenChannelPending = pendingChannelActions.includes("open_channel");
  const isAcceptChannelPending = pendingChannelActions.includes("accept_channel");
  const isShutdownChannelPending = pendingChannelActions.includes("shutdown_channel");

  useEffect(() => {
    setChannelsPage(1);
    setClosedChannelsPage(1);
    setPendingRequestChannels([]);
    setClosedChannels([]);
    closeOpenChannelDialog();
    setShutdownChannelTarget(null);
    closeAcceptChannelDialog();
  }, [activeNode.id]);

  useEffect(() => {
    setChannelsPage((page) => clampPage(page, activeChannels.length, PEERS_PAGE_SIZE));
  }, [activeChannels.length]);

  useEffect(() => {
    setClosedChannelsPage((page) => clampPage(page, closedChannels.length, PEERS_PAGE_SIZE));
  }, [closedChannels.length]);

  useEffect(() => {
    if (!activeNode.rpc?.refreshedAt) return;
    void refreshChannelSideLists();
  }, [activeNode.id, activeNode.rpc?.refreshedAt]);

  const pendingChannelRows = pendingChannels.map((channel) => {
    const row = toRecord(channel);
    const channelId = readChannelIdentifier(channel);
    return [
      formatChannelState(row?.state ?? row?.status),
      shorten(formatValue(row?.pubkey ?? row?.peer_id ?? row?.peer_pubkey ?? row?.peer)),
      shorten(channelId ?? "n/a"),
      formatCkbAmount(row?.local_balance ?? row?.local_amount),
      formatCkbAmount(row?.remote_balance ?? row?.remote_amount),
      <button
        type="button"
        onClick={() => handleAcceptChannel(channel)}
        disabled={isAcceptChannelPending}
        className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 transition hover:border-ckb/70 hover:text-ckb disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Accept pending request"
        title="Accept pending request"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
      </button>
    ];
  });

  const channelRows = activeChannels.map((channel) => {
    const row = toRecord(channel);
    return [
      formatChannelState(row?.state ?? row?.status),
      shorten(formatValue(row?.pubkey ?? row?.peer_id ?? row?.peer_pubkey ?? row?.peer)),
      formatCkbAmount(row?.local_balance ?? row?.local_amount),
      formatCkbAmount(row?.remote_balance ?? row?.remote_amount),
      countOrValue(row?.tlcs ?? row?.pending_tlcs),
      formatValue(row?.enabled),
      <button
        type="button"
        onClick={() => handleShutdownChannel(channel)}
        disabled={isShutdownChannelPending}
        className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-400/70 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Shutdown channel"
        title="Shutdown channel"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    ];
  });

  const closedChannelRows = closedChannels.map((channel) => {
    const row = toRecord(channel);
    return [
      formatChannelState(row?.state ?? row?.status),
      shorten(formatValue(row?.pubkey ?? row?.peer_id ?? row?.peer_pubkey ?? row?.peer)),
      shorten(formatValue(row?.channel_id ?? row?.channelId)),
      formatCkbAmount(row?.local_balance ?? row?.local_amount),
      formatCkbAmount(row?.remote_balance ?? row?.remote_amount),
      countOrValue(row?.tlcs ?? row?.pending_tlcs)
    ];
  });

  function beginChannelAction(action: string) {
    setPendingChannelActions((actions) => (actions.includes(action) ? actions : [...actions, action]));
  }

  function endChannelAction(action: string) {
    setPendingChannelActions((actions) => actions.filter((pendingAction) => pendingAction !== action));
  }

  async function runChannelAction(action: string, operation: () => Promise<void>): Promise<boolean> {
    beginChannelAction(action);
    const pendingNode = markRpcCall(activeNode, action, "pending");
    await onActiveNodeChange(pendingNode);
    try {
      await operation();
      const refreshed = await refreshNode(activeNode);
      await onActiveNodeChange(markRpcCall(refreshed, action, "success"));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      await onActiveNodeChange(markRpcCall(pendingNode, action, "error", message));
      setChannelNoticeKind("error");
      setChannelNotice(message);
      return false;
    } finally {
      endChannelAction(action);
    }
  }

  function handleOpenChannel() {
    setOpenChannelError(null);
    setIsOpenChannelOpen(true);
  }

  function closeOpenChannelDialog() {
    setOpenChannelForm(defaultOpenChannelForm);
    setOpenChannelError(null);
    setIsOpenChannelOpen(false);
  }

  function closeAcceptChannelDialog() {
    setAcceptChannelTarget(null);
    setAcceptChannelFundingAmount("");
    setAcceptChannelError(null);
  }

  function updateOpenChannelField<K extends keyof OpenChannelFormState>(field: K, value: OpenChannelFormState[K]) {
    setOpenChannelForm((form) => ({ ...form, [field]: value }));
    setOpenChannelError(null);
  }

  async function submitOpenChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let params: OpenChannelParams;
    try {
      params = buildOpenChannelParams(openChannelForm);
    } catch (err) {
      setOpenChannelError(err instanceof Error ? err.message : "Invalid open_channel params");
      return;
    }

    setOpenChannelError(null);
    const didOpen = await runChannelAction("open_channel", async () => {
      const result = await openChannel(activeNode, params);
      const temporaryChannelId = readNestedString(result, ["temporary_channel_id", "temporaryChannelId"]);
      setChannelNoticeKind("success");
      setChannelNotice(temporaryChannelId ? `open_channel submitted: ${temporaryChannelId}` : "open_channel submitted.");
    });

    if (didOpen) {
      closeOpenChannelDialog();
    }
  }

  function handleAcceptChannel(channel: unknown) {
    const temporaryChannelId = readChannelIdentifier(channel);
    if (!temporaryChannelId || temporaryChannelId === "n/a") {
      setChannelNoticeKind("error");
      setChannelNotice("Pending channel id is unavailable.");
      return;
    }

    setChannelNotice(null);
    setAcceptChannelTarget({ temporaryChannelId, label: shorten(temporaryChannelId) });
    setAcceptChannelFundingAmount("");
    setAcceptChannelError(null);
  }

  async function confirmAcceptChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acceptChannelTarget) return;

    let params: AcceptChannelParams;
    try {
      params = {
        temporary_channel_id: acceptChannelTarget.temporaryChannelId,
        funding_amount: parseCkbAmountToHex(acceptChannelFundingAmount)
      };
    } catch (err) {
      setAcceptChannelError(err instanceof Error ? err.message : "Invalid accept_channel params");
      return;
    }

    const target = acceptChannelTarget;
    const didAccept = await runChannelAction("accept_channel", async () => {
      const result = await acceptChannel(activeNode, params);
      const channelId = readNestedString(result, ["channel_id", "channelId"]);
      setChannelNoticeKind("success");
      setChannelNotice(channelId ? `accept_channel submitted: ${channelId}` : `accept_channel submitted: ${target.label}`);
    });

    if (didAccept) {
      setPendingRequestChannels((items) => items.filter((item) => {
        return readChannelIdentifier(item) !== target.temporaryChannelId;
      }));
      closeAcceptChannelDialog();
    }
  }

  async function handleListChannels() {
    await loadChannels();
  }

  async function loadChannels() {
    setChannelNotice(null);
    beginChannelAction("list_channels");
    const pendingNode = markRpcCall(activeNode, "list_channels", "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await listChannels(activeNode, {
        pubkey: null,
        include_closed: null,
        only_pending: null
      });
      await onActiveNodeChange(markRpcCall({
        ...pendingNode,
        rpc: {
          ...pendingNode.rpc,
          refreshedAt: new Date().toISOString(),
          channels: normalizeRpcList(result, "channels"),
          errors: omitRpcError(pendingNode.rpc?.errors, "list_channels")
        }
      }, "list_channels", "success"));
      setChannelsPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "list_channels failed";
      await onActiveNodeChange(markRpcCall(pendingNode, "list_channels", "error", message));
      setChannelNoticeKind("error");
      setChannelNotice(message);
    } finally {
      endChannelAction("list_channels");
    }
  }

  async function handleListPendingChannels() {
    setChannelNotice(null);
    await loadPendingChannels();
  }

  async function loadPendingChannels() {
    beginChannelAction("list_pending_channels");
    const pendingNode = markRpcCall(activeNode, "list_channels", "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await listChannels(activeNode, { pubkey: null, include_closed: null, only_pending: true });
      await onActiveNodeChange(markRpcCall(pendingNode, "list_channels", "success"));
      setPendingRequestChannels(normalizeRpcList(result, "channels").filter(isPendingChannel));
    } catch (err) {
      const message = err instanceof Error ? err.message : "list pending channels failed";
      await onActiveNodeChange(markRpcCall(pendingNode, "list_channels", "error", message));
      setChannelNoticeKind("error");
      setChannelNotice(message);
    } finally {
      endChannelAction("list_pending_channels");
    }
  }

  async function handleListClosedChannels() {
    setChannelNotice(null);
    await loadClosedChannels();
  }

  async function loadClosedChannels() {
    beginChannelAction("list_closed_channels");
    const pendingNode = markRpcCall(activeNode, "list_channels", "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await listChannels(activeNode, { pubkey: null, include_closed: true, only_pending: null });
      await onActiveNodeChange(markRpcCall(pendingNode, "list_channels", "success"));
      setClosedChannels(normalizeRpcList(result, "channels").filter(isClosedChannel));
      setClosedChannelsPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "list closed channels failed";
      await onActiveNodeChange(markRpcCall(pendingNode, "list_channels", "error", message));
      setChannelNoticeKind("error");
      setChannelNotice(message);
    } finally {
      endChannelAction("list_closed_channels");
    }
  }

  async function refreshChannelSideLists() {
    await Promise.allSettled([loadPendingChannels(), loadClosedChannels()]);
  }

  function handleShutdownChannel(channel: unknown) {
    const row = toRecord(channel);
    const channelId = formatValue(row?.channel_id ?? row?.channelId);
    if (!channelId || channelId === "n/a") {
      setChannelNoticeKind("error");
      setChannelNotice("Channel id is unavailable.");
      return;
    }

    setChannelNotice(null);
    setShutdownChannelTarget({ channelId, label: shorten(channelId) });
  }

  async function confirmShutdownChannel() {
    if (!shutdownChannelTarget) return;

    const target = shutdownChannelTarget;
    setShutdownChannelTarget(null);
    await runChannelAction("shutdown_channel", () => shutdownChannel(activeNode, { channel_id: target.channelId }));
  }

  return (
    <>
      <div className="grid gap-3">
        <MetricStrip
          items={[
            ["channels", String(activeChannels.length)],
            ["pending / opening", String(pendingChannels.length)],
            ["closed", String(closedChannels.length)],
            ["pending tlcs", String(tlcs.length)]
          ]}
        />
        <DensePanel
          title="Pending Channel Requests"
          icon={CircleDot}
          count={pendingChannels.length}
          headerAction={{
            label: "Refresh pending channel requests",
            onClick: handleListPendingChannels,
            disabled: isListPendingChannelsPending,
            isPending: isListPendingChannelsPending
          }}
        >
          {channelNotice ? (
            <div
              className={[
                "mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                channelNoticeKind === "success"
                  ? "border-ckb/30 bg-ckb/10 text-emerald-100"
                  : "border-red-400/30 bg-red-500/10 text-red-200"
              ].join(" ")}
            >
              {channelNoticeKind === "error" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              <div className="min-w-0 flex-1 break-words">{channelNotice}</div>
              <button
                type="button"
                onClick={() => setChannelNotice(null)}
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                  channelNoticeKind === "success"
                    ? "text-emerald-100/70 hover:bg-ckb/10 hover:text-emerald-50"
                    : "text-red-200/70 hover:bg-red-400/10 hover:text-red-100"
                ].join(" ")}
                aria-label="Dismiss channel notice"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          ) : null}
          <DataTable
            columns={["state", "peer", "temporary id", "local (CKB)", "remote (CKB)", "action"]}
            rows={pendingChannelRows}
            emptyText="No pending channel requests returned"
          />
        </DensePanel>
        <DensePanel
          title="Channels"
          icon={Layers3}
          count={activeChannels.length}
          headerAction={{
            label: "Refresh channels",
            onClick: handleListChannels,
            disabled: isListChannelsPending,
            isPending: isListChannelsPending
          }}
          headerActions={[
            {
              label: "open_channel",
              onClick: handleOpenChannel,
              disabled: isOpenChannelPending,
              isPending: isOpenChannelPending,
              icon: Plus
            }
          ]}
        >
          <PaginatedDataTable
            columns={["state", "peer", "local (CKB)", "remote (CKB)", "tlcs", "enabled", "action"]}
            rows={channelRows}
            emptyText="No channels returned by list_channels"
            page={channelsPage}
            pageSize={PEERS_PAGE_SIZE}
            onPageChange={setChannelsPage}
          />
        </DensePanel>
        <DensePanel
          title="Closed Channels"
          icon={WifiOff}
          count={closedChannels.length}
          headerAction={{
            label: "Refresh closed channels",
            onClick: handleListClosedChannels,
            disabled: isListClosedChannelsPending,
            isPending: isListClosedChannelsPending
          }}
        >
          <PaginatedDataTable
            columns={["state", "peer", "channel id", "local (CKB)", "remote (CKB)", "tlcs"]}
            rows={closedChannelRows}
            emptyText="No closed channels returned"
            page={closedChannelsPage}
            pageSize={PEERS_PAGE_SIZE}
            onPageChange={setClosedChannelsPage}
          />
        </DensePanel>
        <DensePanel title="Pending TLCs" icon={ArrowRightLeft}>
          <DataTable
            columns={["id", "amount", "hash", "status"]}
            rows={tlcs.map((tlc) => {
              const row = toRecord(tlc);
              return [
                formatValue(row?.id ?? row?.tlc_id),
                formatValue(row?.amount ?? row?.value),
                shorten(formatValue(row?.hash ?? row?.payment_hash)),
                formatValue(row?.status ?? row?.state)
              ];
            })}
            emptyText="No pending TLCs returned"
          />
        </DensePanel>
      </div>

      {isOpenChannelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form className="w-full max-w-3xl rounded-lg border border-white/10 bg-panel text-slate-100 shadow-2xl" onSubmit={submitOpenChannel}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Open Channel</div>
              <button
                type="button"
                onClick={closeOpenChannelDialog}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close open channel dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <PubkeySelectField
                  label="pubkey"
                  required
                  value={openChannelForm.pubkey}
                  onChange={(value) => updateOpenChannelField("pubkey", value)}
                  nodes={nodes}
                  activeNodeId={activeNode.id}
                  placeholder="peer pubkey"
                  autoFocus
                />
                <TextInputField
                  label="funding_amount (CKB)"
                  required
                  value={openChannelForm.funding_amount}
                  onChange={(value) => updateOpenChannelField("funding_amount", value)}
                  placeholder="500 or 500.25"
                />
                <TextInputField
                  label="commitment_delay_epoch"
                  value={openChannelForm.commitment_delay_epoch}
                  onChange={(value) => updateOpenChannelField("commitment_delay_epoch", value)}
                  placeholder="default 1 epoch"
                />
                <TextInputField
                  label="commitment_fee_rate"
                  value={openChannelForm.commitment_fee_rate}
                  onChange={(value) => updateOpenChannelField("commitment_fee_rate", value)}
                />
                <TextInputField
                  label="funding_fee_rate"
                  value={openChannelForm.funding_fee_rate}
                  onChange={(value) => updateOpenChannelField("funding_fee_rate", value)}
                />
                <TextInputField
                  label="tlc_expiry_delta"
                  value={openChannelForm.tlc_expiry_delta}
                  onChange={(value) => updateOpenChannelField("tlc_expiry_delta", value)}
                  placeholder="default 4h"
                />
                <TextInputField
                  label="tlc_min_value"
                  value={openChannelForm.tlc_min_value}
                  onChange={(value) => updateOpenChannelField("tlc_min_value", value)}
                  placeholder="default 0"
                />
                <TextInputField
                  label="tlc_fee_proportional_millionths"
                  value={openChannelForm.tlc_fee_proportional_millionths}
                  onChange={(value) => updateOpenChannelField("tlc_fee_proportional_millionths", value)}
                  placeholder="default 1000"
                />
                <TextInputField
                  label="max_tlc_value_in_flight"
                  value={openChannelForm.max_tlc_value_in_flight}
                  onChange={(value) => updateOpenChannelField("max_tlc_value_in_flight", value)}
                />
                <TextInputField
                  label="max_tlc_number_in_flight"
                  value={openChannelForm.max_tlc_number_in_flight}
                  onChange={(value) => updateOpenChannelField("max_tlc_number_in_flight", value)}
                  placeholder="default 125"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={openChannelForm.public}
                    onChange={(event) => updateOpenChannelField("public", event.target.checked)}
                    className="h-4 w-4 accent-ckb"
                  />
                  public (default true)
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={openChannelForm.one_way}
                    onChange={(event) => updateOpenChannelField("one_way", event.target.checked)}
                    className="h-4 w-4 accent-ckb"
                  />
                  one_way (default false)
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <JsonTextAreaField
                  label="funding_udt_type_script"
                  value={openChannelForm.funding_udt_type_script}
                  onChange={(value) => updateOpenChannelField("funding_udt_type_script", value)}
                />
                <JsonTextAreaField
                  label="shutdown_script"
                  value={openChannelForm.shutdown_script}
                  onChange={(value) => updateOpenChannelField("shutdown_script", value)}
                />
              </div>

              {openChannelError ? (
                <div className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {openChannelError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={closeOpenChannelDialog}
                className="h-9 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isOpenChannelPending || openChannelForm.pubkey.trim().length === 0 || openChannelForm.funding_amount.trim().length === 0}
                className="h-9 rounded-md bg-ckb px-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {acceptChannelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form className="w-full max-w-md rounded-lg border border-white/10 bg-panel text-slate-100 shadow-2xl" onSubmit={confirmAcceptChannel}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Accept Pending Request</div>
              <button
                type="button"
                onClick={closeAcceptChannelDialog}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close accept channel dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="grid gap-3 p-4">
              <CompactRows rows={[["temporary id", acceptChannelTarget.label]]} />
              <TextInputField
                label="funding_amount (CKB)"
                required
                value={acceptChannelFundingAmount}
                onChange={(value) => {
                  setAcceptChannelFundingAmount(value);
                  setAcceptChannelError(null);
                }}
                placeholder="300 or 300.25"
                autoFocus
              />
              {acceptChannelError ? (
                <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {acceptChannelError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={closeAcceptChannelDialog}
                className="h-9 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAcceptChannelPending || acceptChannelFundingAmount.trim().length === 0}
                className="h-9 rounded-md bg-ckb px-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {shutdownChannelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-panel text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Shutdown Channel</div>
              <button
                type="button"
                onClick={() => setShutdownChannelTarget(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close shutdown channel dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-start gap-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <div className="font-semibold text-red-100">Confirm shutdown_channel?</div>
                  <div className="mt-1 break-all font-mono text-xs text-red-100/80">{shutdownChannelTarget.label}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setShutdownChannelTarget(null)}
                className="h-9 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmShutdownChannel()}
                disabled={isShutdownChannelPending}
                className="h-9 rounded-md bg-red-400 px-3 text-sm font-semibold text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PaymentsCanvas({
  nodes,
  activeNode,
  onActiveNodeChange
}: {
  nodes: ManagedNode[];
  activeNode: ManagedNode;
  onActiveNodeChange(node: ManagedNode): Promise<void>;
}) {
  const payments = activeNode.rpc?.payments ?? [];
  const defaultInvoiceCurrency = defaultInvoiceCurrencyForNetwork(activeNode.network);
  const [sendForm, setSendForm] = useState<SendPaymentFormState>(defaultSendPaymentForm);
  const [invoiceForm, setInvoiceForm] = useState<NewInvoiceFormState>(() => ({
    ...defaultNewInvoiceForm,
    currency: defaultInvoiceCurrency
  }));
  const [paymentHash, setPaymentHash] = useState("");
  const [invoiceLookup, setInvoiceLookup] = useState("");
  const [invoiceResult, setInvoiceResult] = useState<unknown>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<StoredInvoiceHistoryItem[]>([]);
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<string[]>([]);
  const invoiceHistoryRef = useRef<StoredInvoiceHistoryItem[]>([]);
  const invoiceHistoryRevisionRef = useRef(0);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [paymentNoticeKind, setPaymentNoticeKind] = useState<"success" | "error">("success");
  const [pendingPaymentActions, setPendingPaymentActions] = useState<string[]>([]);
  const activeActions = pendingPaymentActions;

  const isAnyPaymentPending = pendingPaymentActions.length > 0;
  const invoiceAmountUsesCkb = isCkbInvoiceCurrency(invoiceForm.currency);

  useEffect(() => {
    setInvoiceForm((form) => (form.currency.trim() ? form : { ...form, currency: defaultInvoiceCurrency }));
  }, [defaultInvoiceCurrency]);

  useEffect(() => {
    let isCurrent = true;
    const revision = invoiceHistoryRevisionRef.current;
    invoiceHistoryRef.current = [];
    setInvoiceHistory([]);
    setExpandedInvoiceIds([]);

    storage.loadInvoiceHistory(activeNode.id)
      .then((items) => {
        if (isCurrent && invoiceHistoryRevisionRef.current === revision) {
          invoiceHistoryRef.current = items;
          setInvoiceHistory(items);
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        setPaymentNoticeKind("error");
        setPaymentNotice(err instanceof Error ? err.message : "Failed to load invoice history.");
      });

    return () => {
      isCurrent = false;
    };
  }, [activeNode.id]);

  function beginPaymentAction(action: string) {
    setPendingPaymentActions((actions) => (actions.includes(action) ? actions : [...actions, action]));
  }

  function endPaymentAction(action: string) {
    setPendingPaymentActions((actions) => actions.filter((pendingAction) => pendingAction !== action));
  }

  async function runPaymentAction(action: string, load: () => Promise<unknown>, onSuccess?: (result: unknown) => Promise<void> | void) {
    setPaymentNotice(null);
    beginPaymentAction(action);
    const pendingNode = markRpcCall(activeNode, action, "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await load();
      await onSuccess?.(result);
      await onActiveNodeChange(markRpcCall(pendingNode, action, "success"));
      setPaymentNoticeKind("success");
      setPaymentNotice(`${action} completed.`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      await onActiveNodeChange(markRpcCall(pendingNode, action, "error", message));
      setPaymentNoticeKind("error");
      setPaymentNotice(message);
      return null;
    } finally {
      endPaymentAction(action);
    }
  }

  async function handleListPayments() {
    const params = {
      status: null,
      limit: null,
      after: null
    };
    const pendingNode = markRpcCall(activeNode, "list_payments", "pending");
    setPaymentNotice(null);
    beginPaymentAction("list_payments");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await listPayments(activeNode, params);
      await onActiveNodeChange(markRpcCall({
        ...pendingNode,
        rpc: {
          ...pendingNode.rpc,
          refreshedAt: new Date().toISOString(),
          payments: normalizeRpcList(result, "payments"),
          errors: omitRpcError(pendingNode.rpc?.errors, "list_payments")
        }
      }, "list_payments", "success"));
      setPaymentNoticeKind("success");
      setPaymentNotice("list_payments refreshed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "list_payments failed";
      await onActiveNodeChange(markRpcCall(pendingNode, "list_payments", "error", message));
      setPaymentNoticeKind("error");
      setPaymentNotice(message);
    } finally {
      endPaymentAction("list_payments");
    }
  }

  async function handleSendPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let params: Record<string, unknown>;
    try {
      params = buildSendPaymentParams(sendForm);
    } catch (err) {
      setPaymentNoticeKind("error");
      setPaymentNotice(err instanceof Error ? err.message : "Invalid send_payment params");
      return;
    }

    const result = await runPaymentAction("send_payment", () => sendPayment(activeNode, params));
    if (result) {
      await handleListPayments();
    }
  }

  async function handleNewInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let params: Record<string, unknown>;
    try {
      params = buildNewInvoiceParams(invoiceForm, defaultInvoiceCurrency);
    } catch (err) {
      setPaymentNoticeKind("error");
      setPaymentNotice(err instanceof Error ? err.message : "Invalid new_invoice params");
      return;
    }

    const result = await runPaymentAction("new_invoice", () => newInvoice(activeNode, params));
    if (result) {
      setInvoiceResult(result);
      const currentInvoiceHistory = await storage.loadInvoiceHistory(activeNode.id).catch(() => invoiceHistoryRef.current);
      const nextInvoiceHistory = [createInvoiceHistoryItem(result), ...currentInvoiceHistory];
      invoiceHistoryRevisionRef.current += 1;
      invoiceHistoryRef.current = nextInvoiceHistory;
      setInvoiceHistory(nextInvoiceHistory);
      try {
        await storage.saveInvoiceHistory(activeNode.id, nextInvoiceHistory);
      } catch (err) {
        setPaymentNoticeKind("error");
        setPaymentNotice(err instanceof Error ? err.message : "Failed to save invoice history.");
      }
    }
  }

  async function handleGetPayment() {
    const hash = paymentHash.trim();
    if (!hash) {
      setPaymentNoticeKind("error");
      setPaymentNotice("payment_hash is required.");
      return;
    }

    const result = await runPaymentAction("get_payment", () => getPayment(activeNode, { payment_hash: hash }));
  }

  async function handleInvoiceAction(action: "parse_invoice" | "get_invoice" | "cancel_invoice") {
    let params: Record<string, unknown>;
    try {
      params = buildInvoiceLookupParams(invoiceLookup, action);
    } catch (err) {
      setPaymentNoticeKind("error");
      setPaymentNotice(err instanceof Error ? err.message : `Invalid ${action} params`);
      return;
    }

    if (action === "get_invoice") {
      const result = await handleGetInvoiceLookup(params);
      if (result) {
        setInvoiceResult(result);
      }
      return;
    }

    const call = action === "parse_invoice"
      ? () => parseInvoice(activeNode, params)
      : () => cancelInvoice(activeNode, params);
    const result = await runPaymentAction(action, call);
    if (result) {
      setInvoiceResult(result);
    }
  }

  async function handleGetInvoiceLookup(params: Record<string, unknown>) {
    const action = "get_invoice";
    setPaymentNotice(null);
    beginPaymentAction(action);
    const pendingNode = markRpcCall(activeNode, action, "pending");
    await onActiveNodeChange(pendingNode);
    try {
      const result = await getInvoice(activeNode, params);
      await onActiveNodeChange(markRpcCall(pendingNode, action, "success"));
      setPaymentNoticeKind("success");
      setPaymentNotice(`${action} completed.`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      if (!isInvoiceNotFoundMessage(message)) {
        await onActiveNodeChange(markRpcCall(pendingNode, action, "error", message));
        setPaymentNoticeKind("error");
        setPaymentNotice(message);
        return null;
      }

      const otherNodes = nodes.filter((node) => node.id !== activeNode.id);
      const lookupErrors: string[] = [];
      for (const node of otherNodes) {
        try {
          const result = await getInvoice(node, params);
          await onActiveNodeChange(markRpcCall(pendingNode, action, "success"));
          setPaymentNoticeKind("success");
          setPaymentNotice(`get_invoice found on ${node.name}; ${activeNode.name} returned invoice not found.`);
          return annotateInvoiceLookupResult(result, node);
        } catch (lookupErr) {
          const lookupMessage = lookupErr instanceof Error ? lookupErr.message : `${node.name} get_invoice failed`;
          if (!isInvoiceNotFoundMessage(lookupMessage)) {
            lookupErrors.push(`${node.name}: ${lookupMessage}`);
          }
        }
      }

      const notFoundMessage = otherNodes.length === 0
        ? message
        : `invoice not found on ${[activeNode.name, ...otherNodes.map((node) => node.name)].join(", ")}`;
      const finalMessage = lookupErrors.length > 0
        ? `${notFoundMessage}; ${lookupErrors.join("; ")}`
        : notFoundMessage;
      await onActiveNodeChange(markRpcCall(pendingNode, action, "error", finalMessage));
      setPaymentNoticeKind("error");
      setPaymentNotice(finalMessage);
      return null;
    } finally {
      endPaymentAction(action);
    }
  }

  return (
    <div className="grid gap-3">
      {paymentNotice ? (
        <div className={[
          "rounded-md border px-3 py-2 text-xs",
          paymentNoticeKind === "success"
            ? "border-ckb/30 bg-ckb/10 text-ckb"
            : "border-red-400/30 bg-red-500/10 text-red-200"
        ].join(" ")}>
          {paymentNotice}
        </div>
      ) : null}
      <div className="grid gap-3 xl:grid-cols-2">
        <DensePanel title="Send Payment" icon={Coins}>
          <form className="grid gap-3" onSubmit={handleSendPayment}>
            <TextInputField label="invoice" value={sendForm.invoice} onChange={(value) => setSendForm((form) => ({ ...form, invoice: value }))} />
            <PubkeySelectField
              label="target_pubkey"
              value={sendForm.target_pubkey}
              onChange={(value) => setSendForm((form) => ({ ...form, target_pubkey: value }))}
              nodes={nodes}
              activeNodeId={activeNode.id}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInputField label="amount (CKB)" value={sendForm.amount} onChange={(value) => setSendForm((form) => ({ ...form, amount: value }))} placeholder="0.01" />
              <TextInputField label="max_fee_amount" value={sendForm.max_fee_amount} onChange={(value) => setSendForm((form) => ({ ...form, max_fee_amount: value }))} placeholder="0x... or decimal" />
              <TextInputField label="timeout" value={sendForm.timeout} onChange={(value) => setSendForm((form) => ({ ...form, timeout: value }))} placeholder="seconds" />
              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                <CheckboxField label="keysend" checked={sendForm.keysend} onChange={(value) => setSendForm((form) => ({ ...form, keysend: value }))} />
                <CheckboxField label="dry_run" checked={sendForm.dry_run} onChange={(value) => setSendForm((form) => ({ ...form, dry_run: value }))} />
              </div>
            </div>
            <ActionButton label="send_payment" disabled={isAnyPaymentPending} />
          </form>

          <div className="mt-4 border-t border-white/10 pt-4">
            <SectionHeader title="Payments History" icon={Activity} />
            <div className="mb-3 grid gap-2">
              <TextInputField label="payment_hash" value={paymentHash} onChange={setPaymentHash} />
            </div>
            <PanelToolbar
              actions={["list_payments", "get_payment"]}
              activeActions={activeActions}
              disabled={isAnyPaymentPending}
              onAction={(action) => {
                if (action === "list_payments") void handleListPayments();
                if (action === "get_payment") void handleGetPayment();
              }}
            />
            <DataTable
              columns={["status", "payment hash", "fee", "updated", "error"]}
              rows={payments.map((payment) => {
                const row = toRecord(payment);
                return [
                  formatValue(row?.status ?? row?.state),
                  shorten(formatValue(row?.payment_hash ?? row?.hash)),
                  formatValue(row?.fee ?? row?.fee_amount),
                  formatValue(row?.updated_at ?? row?.created_at ?? row?.timestamp),
                  formatValue(row?.error ?? row?.failed_error ?? "none")
                ];
              })}
              emptyText="No payments returned by list_payments"
            />
          </div>
        </DensePanel>

        <DensePanel title="Invoice Workflow" icon={ReceiptText}>
          <form className="grid gap-3" onSubmit={handleNewInvoice}>
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInputField
                label={invoiceAmountUsesCkb ? "amount (CKB)" : "amount"}
                required
                value={invoiceForm.amount}
                onChange={(value) => setInvoiceForm((form) => ({ ...form, amount: value }))}
                placeholder={invoiceAmountUsesCkb ? "0.01" : "0x... or decimal"}
              />
              <TextInputField label="currency" value={invoiceForm.currency} onChange={(value) => setInvoiceForm((form) => ({ ...form, currency: value }))} placeholder="Fibd / Fibt / Fibb" />
              <TextInputField label="expiry" value={invoiceForm.expiry} onChange={(value) => setInvoiceForm((form) => ({ ...form, expiry: value }))} placeholder="seconds" />
              <TextInputField label="description" value={invoiceForm.description} onChange={(value) => setInvoiceForm((form) => ({ ...form, description: value }))} />
              <CheckboxField label="allow_mpp" checked={invoiceForm.allow_mpp} onChange={(value) => setInvoiceForm((form) => ({ ...form, allow_mpp: value }))} />
              <CheckboxField label="allow_trampoline" checked={invoiceForm.allow_trampoline} onChange={(value) => setInvoiceForm((form) => ({ ...form, allow_trampoline: value }))} />
            </div>
            <ActionButton label="new_invoice" disabled={isAnyPaymentPending} />
          </form>

          <div className="mt-4 border-t border-white/10 pt-4">
            <SectionHeader title="Invoice Lookup" icon={ReceiptText} />
            <TextInputField label="invoice / payment_hash" value={invoiceLookup} onChange={setInvoiceLookup} />
            <PanelToolbar
              actions={["parse_invoice", "get_invoice", "cancel_invoice"]}
              activeActions={activeActions}
              disabled={isAnyPaymentPending}
              onAction={(action) => void handleInvoiceAction(action as "parse_invoice" | "get_invoice" | "cancel_invoice")}
            />
            <JsonPreview title="Invoice Result" value={formatInvoiceResultForDisplay(invoiceResult ?? {})} />
          </div>

          <InvoiceHistoryList
            items={invoiceHistory}
            expandedIds={expandedInvoiceIds}
            onToggle={(id) => {
              setExpandedInvoiceIds((ids) => (
                ids.includes(id) ? ids.filter((itemId) => itemId !== id) : [...ids, id]
              ));
            }}
          />
        </DensePanel>
      </div>
    </div>
  );
}

function DensePanel({
  title,
  icon: Icon,
  children,
  count,
  headerAction,
  headerActions,
  className = ""
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
  count?: number;
  headerAction?: {
    label: string;
    onClick(): void;
    disabled?: boolean;
    isPending?: boolean;
    icon?: typeof Activity;
  };
  headerActions?: Array<{
    label: string;
    onClick(): void;
    disabled?: boolean;
    isPending?: boolean;
    icon?: typeof Activity;
  }>;
  className?: string;
}) {
  const actions = [...(headerAction ? [headerAction] : []), ...(headerActions ?? [])];

  return (
    <section className={`min-w-0 rounded-md border border-white/10 bg-white/[0.035] ${className}`}>
      <div className="flex h-9 items-center gap-2 border-b border-white/10 px-3">
        <Icon className="h-3.5 w-3.5 shrink-0 text-ckb" aria-hidden />
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase text-slate-300">{title}</h3>
        {actions.map((action) => {
          const ActionIcon = action.icon ?? RefreshCw;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 transition hover:border-ckb/60 hover:text-ckb disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={action.label}
              title={action.label}
            >
              <ActionIcon className={`h-3.5 w-3.5 ${action.isPending ? "animate-spin" : ""}`} aria-hidden />
            </button>
          );
        })}
        {typeof count === "number" ? (
          <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
            {count}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 p-3">{children}</div>
    </section>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: typeof Activity }) {
  return (
    <div className="mb-3 flex h-7 items-center gap-2 text-xs font-semibold text-slate-400">
      <Icon className="h-3.5 w-3.5 text-ckb" aria-hidden />
      <span>{title}</span>
    </div>
  );
}

function CollapsibleGraphPanel({
  title,
  icon: Icon,
  count,
  isOpen,
  onToggle,
  headerAction,
  children
}: {
  title: string;
  icon: typeof Activity;
  count: number;
  isOpen: boolean;
  onToggle(): void;
  headerAction?: {
    label: string;
    onClick(): void;
    disabled?: boolean;
    isPending?: boolean;
  };
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-md border border-white/10 bg-white/[0.035]">
      <div className="flex h-9 items-center gap-2 border-b border-white/10 px-3">
        <button
          type="button"
          onClick={onToggle}
          className="-mx-1 flex h-full min-w-0 flex-1 items-center gap-2 rounded px-1 text-left transition hover:bg-white/[0.04]"
          aria-expanded={isOpen}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-ckb" aria-hidden />
          <h3 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase text-slate-300">{title}</h3>
        </button>
        {headerAction ? (
          <button
            type="button"
            onClick={headerAction.onClick}
            disabled={headerAction.disabled}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 transition hover:border-ckb/60 hover:text-ckb disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={headerAction.label}
            title={headerAction.label}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${headerAction.isPending ? "animate-spin" : ""}`} aria-hidden />
          </button>
        ) : null}
        <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
          {count}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition hover:bg-white/[0.04]"
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
          aria-expanded={isOpen}
        >
          <ChevronRight className={`h-3.5 w-3.5 text-slate-500 transition ${isOpen ? "rotate-90" : ""}`} aria-hidden />
        </button>
      </div>
      {isOpen ? <div className="min-w-0 p-3">{children}</div> : null}
    </section>
  );
}

function MetricStrip({ items }: { items: Array<[string, string]> }) {
  const columnClassName = items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={`col-span-full grid gap-2 ${columnClassName}`}>
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
          <div className="text-[11px] uppercase text-slate-500">{label}</div>
          <div className="truncate text-sm font-semibold text-slate-100" title={value}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function KeyValueGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-x-3 gap-y-2 text-xs sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-slate-500">{label}</dt>
          <dd className="truncate font-mono text-slate-200" title={value}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CompactRows({ rows }: { rows: Array<[string, React.ReactNode, boolean?]> }) {
  return (
    <div className="divide-y divide-white/10 rounded-md border border-white/10">
      {rows.map(([label, value, wrap]) => (
        <div key={label} className="grid grid-cols-[116px_minmax(0,1fr)] items-center px-2 py-2 text-xs">
          <div className="text-slate-500">{label}</div>
          <div className={`font-mono text-slate-300 ${wrap ? "break-all whitespace-normal" : "truncate"}`} title={typeof value === "string" ? value : undefined}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function TextInputField({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  autoFocus = false
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block text-[11px] text-slate-500">
      {label}{required ? <span className="text-red-300"> *</span> : null}
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? label}
        className="mt-1 h-8 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 text-xs text-slate-200 outline-none focus:border-ckb"
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="flex h-8 items-center gap-2 self-end rounded-md border border-white/10 bg-slate-950/60 px-2 text-[11px] text-slate-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-ckb"
      />
      {label}
    </label>
  );
}

function ActionButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-8 rounded-md bg-ckb px-3 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function JsonTextAreaField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <label className="block text-[11px] text-slate-500">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder='{"code_hash":"0x...","hash_type":"type","args":"0x..."}'
        className="mt-1 h-24 w-full resize-none rounded-md border border-white/10 bg-slate-950/60 px-2 py-2 font-mono text-xs text-slate-200 outline-none focus:border-ckb"
      />
    </label>
  );
}

function PanelToolbar({
  actions,
  activeActions = [],
  disabled = false,
  onAction
}: {
  actions: string[];
  activeActions?: string[];
  disabled?: boolean;
  onAction?(action: string): void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {actions.map((action) => {
        const isActive = activeActions.includes(action);
        return (
          <button
            key={action}
            type="button"
            onClick={() => onAction?.(action)}
            disabled={disabled}
            className={[
              "h-7 rounded border px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
              isActive
                ? "border-ckb/70 bg-ckb/10 text-ckb"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-ckb/60 hover:text-white"
            ].join(" ")}
          >
            {action}
          </button>
        );
      })}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyText = "No data"
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyText?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <thead className="bg-white/[0.04] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="h-8 px-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.length === 0 ? (
            <tr className="h-10 text-slate-500">
              <td colSpan={columns.length} className="px-2">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="h-9 text-slate-300">
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className="truncate px-2"
                    title={typeof cell === "string" ? cell : undefined}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaginatedDataTable({
  columns,
  rows,
  emptyText = "No data",
  page,
  pageSize,
  onPageChange
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyText?: string;
  page: number;
  pageSize: number;
  onPageChange(page: number): void;
}) {
  const totalPages = getTotalPages(rows.length, pageSize);
  const currentPage = clampPage(page, rows.length, pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <DataTable columns={columns} rows={visibleRows} emptyText={emptyText} />
      {rows.length > pageSize ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            {startIndex + 1}-{Math.min(startIndex + pageSize, rows.length)} / {rows.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-300 transition hover:border-ckb/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="min-w-16 text-center font-medium text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-300 transition hover:border-ckb/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompactForm({ fields, actions }: { fields: string[]; actions: string[] }) {
  return (
    <div className="mt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field} className="block text-[11px] text-slate-500">
            {field}
            <input
              readOnly
              value=""
              placeholder={field}
              className="mt-1 h-8 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 text-xs text-slate-200 outline-none"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button key={action} type="button" className="h-8 rounded-md bg-ckb px-3 text-xs font-semibold text-slate-950">
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  items,
  value,
  onChange
}: {
  items: Array<{ id: T; label: string }>;
  value: T;
  onChange(value: T): void;
}) {
  return (
    <div
      className="grid gap-1 rounded-md bg-slate-950/70 p-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={[
            "h-7 rounded text-xs font-semibold transition",
            item.id === value ? "bg-white text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-white"
          ].join(" ")}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function JsonPreview({ title, value = { jsonrpc: "2.0", params: {} } }: { title: string; value?: unknown }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/70">
      <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-slate-400">{title}</div>
      <pre className="min-h-44 overflow-auto p-3 text-xs leading-5 text-slate-300">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function InvoiceHistoryList({
  items,
  expandedIds,
  onToggle
}: {
  items: StoredInvoiceHistoryItem[];
  expandedIds: string[];
  onToggle(id: string): void;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-white/10">
      <div className="border-b border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-400">
        Created Invoices
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-3 text-xs text-slate-500">No invoices created yet</div>
      ) : (
        <div className="divide-y divide-white/10">
          {items.map((item) => {
            const isExpanded = expandedIds.includes(item.id);
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_24px] items-center gap-2 px-3 py-2 text-left transition hover:bg-white/[0.04]"
                  aria-expanded={isExpanded}
                >
                  <span className="truncate font-mono text-xs text-slate-300" title={item.invoiceAddress}>
                    {item.invoiceAddress}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 justify-self-end text-slate-500 transition ${isExpanded ? "rotate-180 text-ckb" : ""}`}
                    aria-hidden
                  />
                </button>
                {isExpanded ? (
                  <pre className="max-h-72 overflow-auto border-t border-white/10 bg-slate-950/70 p-3 text-xs leading-5 text-slate-300">
                    {JSON.stringify(formatInvoiceResultForDisplay(item.invoice), null, 2)}
                  </pre>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-slate-950/70 p-3 text-xs leading-6 text-slate-300">
      {lines.map((line, index) => (
        <span key={`${index}-${line}`} className="block min-w-0 truncate whitespace-pre" title={line}>
          {line}
        </span>
      ))}
    </pre>
  );
}

function StatusBar({ activeNode }: { activeNode: ManagedNode | null }) {
  const lastRpcLabel = activeNode ? formatLastRpcLabel(activeNode) : "idle";
  const rpcStatus = activeNode
    ? activeNode.rpc?.lastStatus ?? (activeNode.status === "connected" ? "success" : "idle")
    : "idle";
  const items = activeNode
    ? [
      ["node", activeNode.name],
      ["network", activeNode.network],
      ["latency", activeNode.latencyMs ? `${activeNode.latencyMs} ms` : "n/a"],
      ["last rpc", lastRpcLabel],
      ["rpc status", rpcStatus],
      ["error", activeNode.lastError ?? "none"]
    ]
    : [
      ["node", "none"],
      ["network", "n/a"],
      ["latency", "n/a"],
      ["last rpc", "idle"],
      ["rpc status", "idle"],
      ["error", "none"]
    ];

  return (
    <footer className="grid min-h-10 shrink-0 grid-cols-6 items-center border-t border-white/10 bg-panel text-xs">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 border-r border-white/10 px-3 last:border-r-0">
          <span className="mr-1 text-slate-500">{label}</span>
          <span className="truncate font-medium text-slate-300" title={value}>{value}</span>
        </div>
      ))}
    </footer>
  );
}

function formatLastRpcLabel(node: ManagedNode): string {
  const method = node.rpc?.lastMethod;
  if (!method) {
    return "idle";
  }

  return node.rpc?.lastStatus === "pending" ? `${method}...` : method;
}

function markRpcCall(
  node: ManagedNode,
  method: string,
  status: "pending" | "success" | "error",
  errorMessage?: string
): ManagedNode {
  const now = new Date().toISOString();
  return {
    ...node,
    rpc: {
      ...node.rpc,
      lastMethod: method,
      lastStatus: status,
      lastStartedAt: status === "pending" ? now : node.rpc?.lastStartedAt,
      lastFinishedAt: status === "pending" ? undefined : now,
      errors: status === "error" ? { ...node.rpc?.errors, [method]: errorMessage ?? `${method} failed` } : omitRpcError(node.rpc?.errors, method)
    },
    lastError: status === "error" ? errorMessage ?? node.lastError : status === "success" ? undefined : node.lastError
  };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function unwrapNodeInfo(value: unknown): Record<string, unknown> | null {
  const record = toRecord(value);
  if (!record) return null;

  // If it looks like a direct node_info payload, return as-is
  if (
    typeof record.pubkey === "string" ||
    typeof record.version === "string" ||
    Array.isArray(record.addresses) ||
    typeof record.chain_hash === "string" ||
    typeof record.chainHash === "string"
  ) {
    return record;
  }

  // Unwrap nested wrappers like { result: { ... } } or { node_info: { ... } }
  for (const key of ["result", "node_info", "nodeInfo", "data"]) {
    const nested = unwrapNodeInfo(record[key]);
    if (nested) return nested;
  }

  return record;
}

function nodeVersionLabel(node: ManagedNode): string {
  if (node.status !== "connected") return "n/a";
  return readNestedString(node.rpc?.nodeInfo, ["version"]) ?? "n/a";
}

function readNestedString(value: unknown, keys: string[]): string | null {
  const record = toRecord(value);
  if (!record) return null;

  for (const key of keys) {
    const field = record[key];
    if (typeof field === "string" && field.length > 0) {
      return field;
    }
  }

  for (const key of ["result", "node_info", "nodeInfo", "data"]) {
    const nested = readNestedString(record[key], keys);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function pickRecord(source: Record<string, unknown> | null, keys: string[]): Record<string, unknown> | null {
  if (!source) return null;

  for (const key of keys) {
    const value = source[key];
    const record = toRecord(value);
    if (record) {
      return record;
    }
  }

  return null;
}

function pickArray(source: Record<string, unknown> | null, keys: string[]): unknown[] {
  if (!source) return [];

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function readCount(source: Record<string, unknown> | null, keys: string[], fallback = 0): number {
  if (!source) return fallback;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && /^\d+$/.test(value)) {
      return Number(value);
    }
  }

  return fallback;
}

function pickKnown(source: Record<string, unknown> | null, keys: string[]): Record<string, unknown> {
  if (!source) return {};

  return Object.fromEntries(keys.map((key) => [key, source[key]]).filter(([, value]) => value !== undefined));
}

function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function clampPage(page: number, totalItems: number, pageSize: number): number {
  return Math.min(Math.max(1, page), getTotalPages(totalItems, pageSize));
}

function formatJsonLines(value: unknown): string[] {
  if (value === null || value === undefined || (toRecord(value) && Object.keys(toRecord(value) ?? {}).length === 0)) {
    return ["No data returned"];
  }

  return JSON.stringify(value, null, 2).split("\n");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  if (Array.isArray(value)) {
    return value.length <= 3 ? value.map(formatValue).join(", ") : `${value.length} items`;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatAddressList(value: unknown): React.ReactNode {
  const addresses = (Array.isArray(value) ? value : typeof value === "string" ? [value] : [])
    .flatMap((item) => {
      const text = typeof item === "string" ? item : formatValue(item);
      return text.split(",").map((address) => address.trim());
    })
    .filter(Boolean);

  if (addresses.length === 0) {
    return formatValue(value);
  }

  return (
    <div className="space-y-1">
      {addresses.map((address, index) => (
        <div key={`${address}-${index}`}>{address}</div>
      ))}
    </div>
  );
}

function readConnectPeerAddress(node: ManagedNode, activeNodeSource: ManagedNode["source"]): string | null {
  const nodeInfo = unwrapNodeInfo(node.rpc?.nodeInfo);
  const addresses = readAddressStrings(nodeInfo?.addresses);
  const shouldUseWebAddress = activeNodeSource === "fiber-wasm-page";
  const address = addresses.find((item) => shouldUseWebAddress ? isWebSocketAddress(item) : !isWebSocketAddress(item));

  return address ? normalizeConnectPeerAddress(address) : null;
}

function readAddressStrings(value: unknown): string[] {
  const rawItems = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return rawItems
    .flatMap((item) => {
      const text = typeof item === "string" ? item : formatValue(item);
      return text.split(",").map((address) => address.trim());
    })
    .filter((address) => address.length > 0 && address !== "n/a");
}

function isWebSocketAddress(address: string): boolean {
  return /\/wss?(?=\/|$)/.test(address);
}

function normalizeConnectPeerAddress(address: string): string {
  return address.replace(/\b0\.0\.0\.0\b/g, "127.0.0.1");
}

function formatChannelState(value: unknown): string {
  const state = toRecord(value);
  return formatValue(state?.state_name ?? value);
}

function isPendingChannel(channel: unknown): boolean {
  const row = toRecord(channel);
  const state = formatChannelState(row?.state ?? row?.status).toLowerCase();
  return state.includes("pending") || state.includes("negotiating") || state.includes("opening");
}

function isClosedChannel(channel: unknown): boolean {
  const row = toRecord(channel);
  const state = formatChannelState(row?.state ?? row?.status).toLowerCase();
  return state.includes("closed") || state.includes("closing") || state.includes("shutdown");
}

function mergeChannelsById(primary: unknown[], fallback: unknown[]): unknown[] {
  const merged: unknown[] = [];
  const seen = new Set<string>();

  for (const channel of [...primary, ...fallback]) {
    const key = readChannelIdentifier(channel) ?? "n/a";
    if (key === "n/a" || !seen.has(key)) {
      merged.push(channel);
      seen.add(key);
    }
  }

  return merged;
}

function readChannelIdentifier(channel: unknown): string | null {
  const row = toRecord(channel);
  if (!row) return null;

  const value = row.temporary_channel_id ?? row.temporaryChannelId ?? row.channel_id ?? row.channelId;
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value;
}

function formatCkbAmount(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  const rawValue = typeof value === "number" ? String(value) : typeof value === "bigint" ? value.toString() : typeof value === "string" ? value.trim() : null;
  if (!rawValue || (!/^\d+$/.test(rawValue) && !/^0x[0-9a-f]+$/i.test(rawValue))) {
    return formatValue(value);
  }

  const shannons = BigInt(rawValue);
  const milliCkb = (shannons + 50000n) / 100000n;
  const ckb = milliCkb / 1000n;
  const fractional = milliCkb % 1000n;

  return `${ckb.toString()}.${fractional.toString().padStart(3, "0")} CKB`;
}

function formatCkbAmountExact(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  const rawValue = typeof value === "number" ? String(value) : typeof value === "bigint" ? value.toString() : typeof value === "string" ? value.trim() : null;
  if (!rawValue || (!/^\d+$/.test(rawValue) && !/^0x[0-9a-f]+$/i.test(rawValue))) {
    return formatValue(value);
  }

  const shannons = BigInt(rawValue);
  const ckb = shannons / CKB_SHANNONS;
  const fractional = shannons % CKB_SHANNONS;
  if (fractional === 0n) {
    return `${ckb.toString()} CKB`;
  }

  const trimmedFractional = fractional.toString().padStart(8, "0").replace(/0+$/, "");
  return `${ckb.toString()}.${trimmedFractional} CKB`;
}

function formatInvoiceResultForDisplay(value: unknown): unknown {
  return formatInvoiceAmountsForDisplay(value, false);
}

function isInvoiceNotFoundMessage(message: string): boolean {
  return message.toLowerCase().includes("invoice not found");
}

function annotateInvoiceLookupResult(result: unknown, node: ManagedNode): unknown {
  const lookupNode = {
    id: node.id,
    name: node.name,
    endpoint: nodeEndpoint(node)
  };

  if (isRecord(result)) {
    return {
      ...result,
      lookup_node: lookupNode
    };
  }

  return {
    lookup_node: lookupNode,
    result
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createInvoiceHistoryItem(invoice: unknown): StoredInvoiceHistoryItem {
  return {
    id: createInvoiceHistoryId(),
    createdAt: new Date().toISOString(),
    invoiceAddress: readInvoiceAddress(invoice) ?? "n/a",
    invoice
  };
}

function createInvoiceHistoryId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readInvoiceAddress(invoice: unknown): string | null {
  return readNestedString(invoice, ["invoice_address", "invoiceAddress", "invoice", "address"]);
}

function formatInvoiceAmountsForDisplay(value: unknown, parentIsCkbInvoice: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => formatInvoiceAmountsForDisplay(item, parentIsCkbInvoice));
  }

  const record = toRecord(value);
  if (!record) {
    return value;
  }

  const isCkbInvoice = parentIsCkbInvoice || isCkbInvoiceCurrency(record.currency);
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => {
      if (key === "amount" && isCkbInvoice) {
        return [key, formatCkbAmountExact(entry)];
      }

      return [key, formatInvoiceAmountsForDisplay(entry, isCkbInvoice)];
    })
  );
}

function isCkbInvoiceCurrency(value: unknown): boolean {
  return typeof value === "string" && CKB_INVOICE_CURRENCIES.has(value.trim().toLowerCase());
}

function defaultInvoiceCurrencyForNetwork(network: string | undefined): string {
  const normalized = network?.trim().toLowerCase() ?? "";
  if (normalized.includes("main") || normalized.includes("lina")) {
    return "Fibb";
  }
  if (normalized.includes("test") || normalized.includes("pudge")) {
    return "Fibt";
  }

  return "Fibd";
}

function normalizeInvoiceCurrency(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "ckb") {
    return fallback;
  }
  if (normalized === "fibb") return "Fibb";
  if (normalized === "fibt") return "Fibt";
  if (normalized === "fibd") return "Fibd";
  if (normalized.includes("main") || normalized.includes("lina")) return "Fibb";
  if (normalized.includes("test") || normalized.includes("pudge")) return "Fibt";
  if (normalized.includes("dev")) return "Fibd";

  return value.trim();
}

function formatConnectionPorts(nodeInfo: Record<string, unknown> | null): string {
  const addresses = pickArray(nodeInfo, ["addresses"]);
  const ports = new Set<string>();

  for (const address of addresses) {
    if (typeof address !== "string") continue;

    for (const match of address.matchAll(/\/(tcp|ws|wss)\/(\d+)(?=\/|$)/g)) {
      ports.add(`${match[1]} ${match[2]}`);
    }
  }

  return ports.size > 0 ? Array.from(ports).join(", ") : "not announced";
}

function formatLocalRefreshTime(value: string | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const remainingMinutes = absoluteOffset % 60;
  const timezone = `UTC${sign}${padTimePart(offsetHours)}:${padTimePart(remainingMinutes)}`;

  return [
    `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`,
    `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}:${padTimePart(date.getSeconds())}`,
    timezone
  ].join(" ");
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}

function shorten(value: string): string {
  if (value.length <= 28 || value === "n/a") {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function countOrValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value.length);
  }

  return formatValue(value);
}

function buildOpenChannelParams(form: OpenChannelFormState): OpenChannelParams {
  const pubkey = form.pubkey.trim();
  if (!pubkey) {
    throw new Error("pubkey is required.");
  }

  const params: OpenChannelParams = {
    pubkey,
    funding_amount: parseCkbAmountToHex(form.funding_amount),
    public: form.public,
    one_way: form.one_way
  };

  assignOptionalHexField(params, "commitment_delay_epoch", form.commitment_delay_epoch);
  assignOptionalHexField(params, "commitment_fee_rate", form.commitment_fee_rate);
  assignOptionalHexField(params, "funding_fee_rate", form.funding_fee_rate);
  assignOptionalHexField(params, "tlc_expiry_delta", form.tlc_expiry_delta);
  assignOptionalHexField(params, "tlc_min_value", form.tlc_min_value);
  assignOptionalHexField(params, "tlc_fee_proportional_millionths", form.tlc_fee_proportional_millionths);
  assignOptionalHexField(params, "max_tlc_value_in_flight", form.max_tlc_value_in_flight);
  assignOptionalHexField(params, "max_tlc_number_in_flight", form.max_tlc_number_in_flight);
  assignOptionalScriptField(params, "funding_udt_type_script", form.funding_udt_type_script);
  assignOptionalScriptField(params, "shutdown_script", form.shutdown_script);

  return params;
}

function buildSendPaymentParams(form: SendPaymentFormState): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  assignOptionalString(params, "invoice", form.invoice);
  assignOptionalString(params, "target_pubkey", form.target_pubkey);
  assignOptionalCkbAmount(params, "amount", form.amount);
  assignOptionalAmount(params, "max_fee_amount", form.max_fee_amount);
  assignOptionalInteger(params, "timeout", form.timeout);
  if (form.keysend) params.keysend = true;
  params.dry_run = form.dry_run;

  if (!params.invoice && !params.target_pubkey) {
    throw new Error("invoice or target_pubkey is required.");
  }
  if (form.keysend && params.invoice) {
    throw new Error("keysend should use target_pubkey without invoice.");
  }
  if (form.keysend && !params.amount) {
    throw new Error("amount is required for keysend.");
  }

  return params;
}

function buildNewInvoiceParams(form: NewInvoiceFormState, fallbackCurrency: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const currency = normalizeInvoiceCurrency(form.currency, fallbackCurrency);
  assignOptionalInvoiceAmount(params, form.amount, currency);
  assignOptionalString(params, "description", form.description);
  params.currency = currency;
  assignOptionalInteger(params, "expiry", form.expiry);
  params.allow_mpp = form.allow_mpp;
  params.allow_trampoline_routing = form.allow_trampoline;
  return params;
}

function buildInvoiceLookupParams(value: string, action: "parse_invoice" | "get_invoice" | "cancel_invoice"): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(action === "parse_invoice" ? "invoice is required." : "payment_hash is required.");
  }

  return action === "parse_invoice" ? { invoice: trimmed } : { payment_hash: trimmed };
}

function assignOptionalString(params: Record<string, unknown>, field: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) {
    params[field] = trimmed;
  }
}

function assignOptionalAmount(params: Record<string, unknown>, field: string, value: string, required = false) {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      throw new Error(`${field} is required.`);
    }
    return;
  }

  params[field] = parseHexAmountField(field, trimmed);
}

function assignOptionalInvoiceAmount(params: Record<string, unknown>, value: string, currency: string) {
  if (isCkbInvoiceCurrency(currency)) {
    params.amount = parseCkbAmountToHex(value, "amount");
    return;
  }

  assignOptionalAmount(params, "amount", value, true);
}

function assignOptionalCkbAmount(params: Record<string, unknown>, field: string, value: string, required = false) {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      throw new Error(`${field} is required.`);
    }
    return;
  }

  params[field] = parseCkbAmountToHex(trimmed, field);
}

function assignOptionalInteger(params: Record<string, unknown>, field: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  params[field] = parseHexAmountField(field, trimmed);
}

function assignOptionalHexField(params: OpenChannelParams, field: keyof OpenChannelParams, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  params[field] = parseHexAmountField(field, trimmed) as never;
}

function assignOptionalScriptField(params: OpenChannelParams, field: "funding_udt_type_script" | "shutdown_script", value: string) {
  const script = parseOptionalScript(field, value);
  if (script) {
    params[field] = script;
  }
}

function parseHexAmountField(field: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }

  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^\d+$/.test(trimmed)) {
    return `0x${BigInt(trimmed).toString(16)}`;
  }

  throw new Error(`${field} must be a hex string or a decimal integer.`);
}

function parseCkbAmountToHex(value: string, field = "funding_amount"): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`${field} must be a CKB amount, for example 500 or 500.25.`);
  }

  const [whole, fractional = ""] = trimmed.split(".");
  if (fractional.length > 8) {
    throw new Error(`${field} supports up to 8 decimal places.`);
  }

  const shannons = BigInt(whole) * CKB_SHANNONS + BigInt(fractional.padEnd(8, "0"));
  if (shannons <= 0n) {
    throw new Error(`${field} must be greater than 0 CKB.`);
  }

  return `0x${shannons.toString(16)}`;
}

function parseOptionalScript(field: string, value: string): Script | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${field} must be valid JSON.`);
  }

  const script = toRecord(parsed);
  if (
    !script ||
    typeof script.code_hash !== "string" ||
    !/^0x[0-9a-f]+$/i.test(script.code_hash) ||
    !["data", "type", "data1", "data2"].includes(formatValue(script.hash_type)) ||
    typeof script.args !== "string"
  ) {
    throw new Error(`${field} must include code_hash, hash_type, and args.`);
  }

  return {
    code_hash: script.code_hash,
    hash_type: script.hash_type as Script["hash_type"],
    args: script.args
  };
}

function rpcLoadStatus(value: unknown): string {
  if (Array.isArray(value)) {
    return `loaded (${value.length})`;
  }

  return value === undefined ? "not loaded" : "loaded";
}

function omitRpcError(errors: Record<string, string> | undefined, method: string): Record<string, string> | undefined {
  if (!errors || !(method in errors)) {
    return errors;
  }

  const nextErrors = { ...errors };
  delete nextErrors[method];
  return Object.keys(nextErrors).length > 0 ? nextErrors : undefined;
}

function formatRpcErrors(node: ManagedNode): React.ReactNode {
  const errors = node.rpc?.errors;
  if (!errors || Object.keys(errors).length === 0) {
    return node.lastError ?? "none";
  }

  return (
    <div className="space-y-1">
      {Object.entries(errors).map(([method, error]) => (
        <div key={method} className="break-words">
          <span className="text-slate-400">{method}:</span> {error}
        </div>
      ))}
    </div>
  );
}

function nodeEndpoint(node: ManagedNode): string {
  return node.source === "fiber-rpc" ? node.rpcEndpoint : node.targetPageUrl;
}
