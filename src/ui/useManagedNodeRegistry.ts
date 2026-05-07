import { useEffect, useMemo, useState } from "react";
import { addManagedNode, createNodeRegistry, getActiveNode } from "../node/registry";
import { refreshNode, refreshNodes } from "../node/fiber-api";
import type { ManagedNode, ManagedNodeInput } from "../schemas/managed-node";
import type { ExtensionStorage } from "../store/extension-storage";

export function useManagedNodeRegistry(storage: ExtensionStorage) {
  const [nodes, setNodes] = useState<ManagedNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const registry = useMemo(() => createNodeRegistry(nodes, activeNodeId), [nodes, activeNodeId]);
  const activeNode = getActiveNode(registry);

  useEffect(() => {
    storage.loadNodeRegistry().then(async (loaded) => {
      setNodes(loaded.nodes);
      setActiveNodeId(loaded.activeNodeId);
      setIsReady(true);

      if (loaded.nodes.length > 0) {
        setIsRefreshing(true);
        try {
          const refreshed = await refreshNodes(loaded.nodes);
          setNodes(refreshed);
          const nextRegistry = createNodeRegistry(refreshed, loaded.activeNodeId);
          await storage.saveNodeRegistry(nextRegistry);
        } finally {
          setIsRefreshing(false);
        }
      }
    });
  }, [storage]);

  async function addNode(input: ManagedNodeInput) {
    const next = addManagedNode(registry, input);
    setNodes(next.nodes);
    setActiveNodeId(next.activeNodeId);
    await storage.saveNodeRegistry(next);

    const addedNode = next.nodes.find((node) => node.id === next.activeNodeId);
    if (!addedNode || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const refreshed = await refreshNode(addedNode);
      const refreshedNodes = next.nodes.map((node) => (node.id === addedNode.id ? refreshed : node));
      const refreshedRegistry = createNodeRegistry(refreshedNodes, addedNode.id);
      setNodes(refreshedNodes);
      await storage.saveNodeRegistry(refreshedRegistry);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function selectNode(nodeId: string) {
    setActiveNodeId(nodeId);
    await storage.saveNodeRegistry(createNodeRegistry(nodes, nodeId));

    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const refreshed = await refreshNode(targetNode);
      const refreshedNodes = nodes.map((node) => (node.id === nodeId ? refreshed : node));
      setNodes(refreshedNodes);
      const nextRegistry = createNodeRegistry(refreshedNodes, nodeId);
      await storage.saveNodeRegistry(nextRegistry);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function refreshAll() {
    if (isRefreshing || nodes.length === 0) return;
    setIsRefreshing(true);
    try {
      const refreshed = await refreshNodes(nodes);
      setNodes(refreshed);
      const nextRegistry = createNodeRegistry(refreshed, activeNodeId);
      await storage.saveNodeRegistry(nextRegistry);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function updateActiveNode(updatedNode: ManagedNode) {
    const nextNodes = nodes.map((node) => (node.id === updatedNode.id ? updatedNode : node));
    setNodes(nextNodes);
    await storage.saveNodeRegistry(createNodeRegistry(nextNodes, updatedNode.id));
  }

  async function reorderNodes(sourceNodeId: string, targetNodeId: string, placement: "before" | "after") {
    if (sourceNodeId === targetNodeId) return;

    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode) return;

    const withoutSource = nodes.filter((node) => node.id !== sourceNodeId);
    const targetIndex = withoutSource.findIndex((node) => node.id === targetNodeId);
    if (targetIndex === -1) return;

    const insertIndex = placement === "before" ? targetIndex : targetIndex + 1;
    const nextNodes = [
      ...withoutSource.slice(0, insertIndex),
      sourceNode,
      ...withoutSource.slice(insertIndex)
    ];

    setNodes(nextNodes);
    await storage.saveNodeRegistry(createNodeRegistry(nextNodes, activeNodeId));
  }

  return {
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
  };
}
