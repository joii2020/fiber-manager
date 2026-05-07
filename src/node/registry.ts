import {
  managedNodeInputSchema,
  managedNodeSchema,
  type ManagedNode,
  type ManagedNodeInput
} from "../schemas/managed-node";

export type NodeRegistryState = {
  nodes: ManagedNode[];
  activeNodeId: string | null;
};

export function createNodeRegistry(nodes: ManagedNode[], activeNodeId: string | null = null): NodeRegistryState {
  const parsedNodes = nodes.map((node) => managedNodeSchema.parse(node));
  const nextActiveNodeId = parsedNodes.some((node) => node.id === activeNodeId)
    ? activeNodeId
    : parsedNodes[0]?.id ?? null;

  return {
    nodes: parsedNodes,
    activeNodeId: nextActiveNodeId
  };
}

export function getActiveNode(registry: NodeRegistryState): ManagedNode | null {
  return registry.nodes.find((node) => node.id === registry.activeNodeId) ?? null;
}

export function addManagedNode(registry: NodeRegistryState, input: ManagedNodeInput): NodeRegistryState {
  const parsed = managedNodeInputSchema.parse(input);
  const node = managedNodeSchema.parse({
    ...parsed,
    id: createNodeId(parsed.name),
    status: "disconnected"
  });

  return {
    nodes: [...registry.nodes.filter((existing) => existing.id !== node.id), node],
    activeNodeId: node.id
  };
}

export function createNodeId(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `node-${Date.now()}`;
}
