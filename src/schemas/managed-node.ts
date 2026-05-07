import { z } from "zod";

export const nodeSourceSchema = z.enum(["fiber-rpc", "fiber-wasm-page"]);
export const nodeStatusSchema = z.enum(["connected", "connecting", "disconnected", "error"]);

export const nodeRpcSnapshotSchema = z.object({
  refreshedAt: z.string().datetime().optional(),
  lastMethod: z.string().min(1).optional(),
  lastStatus: z.enum(["pending", "success", "error"]).optional(),
  lastStartedAt: z.string().datetime().optional(),
  lastFinishedAt: z.string().datetime().optional(),
  nodeInfo: z.unknown().optional(),
  peers: z.array(z.unknown()).optional(),
  channels: z.array(z.unknown()).optional(),
  payments: z.array(z.unknown()).optional(),
  graphNodes: z.array(z.unknown()).optional(),
  graphChannels: z.array(z.unknown()).optional(),
  errors: z.record(z.string()).optional()
});

const baseManagedNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  source: nodeSourceSchema,
  status: nodeStatusSchema,
  network: z.string().min(1).max(48),
  latencyMs: z.number().int().nonnegative().optional(),
  latestBlock: z.number().int().nonnegative().optional(),
  syncState: z.string().min(1).max(80).optional(),
  lastError: z.string().min(1).max(240).optional(),
  pubkey: z.string().min(1).optional(),
  rpc: nodeRpcSnapshotSchema.optional()
});

export const fiberRpcNodeSchema = baseManagedNodeSchema.extend({
  source: z.literal("fiber-rpc"),
  rpcEndpoint: z.string().url(),
  authToken: z.string().trim().min(1).optional()
});

export const fiberWasmPageNodeSchema = baseManagedNodeSchema.extend({
  source: z.literal("fiber-wasm-page"),
  targetPageUrl: z.string().url(),
  mountPoint: z.string().min(1).max(120).optional()
});

export const managedNodeSchema = z.discriminatedUnion("source", [
  fiberRpcNodeSchema,
  fiberWasmPageNodeSchema
]);

export const managedNodeInputSchema = z.discriminatedUnion("source", [
  fiberRpcNodeSchema.omit({ id: true, status: true }),
  fiberWasmPageNodeSchema.omit({ id: true, status: true })
]);

export type NodeSource = z.infer<typeof nodeSourceSchema>;
export type NodeStatus = z.infer<typeof nodeStatusSchema>;
export type NodeRpcSnapshot = z.infer<typeof nodeRpcSnapshotSchema>;
export type ManagedNode = z.infer<typeof managedNodeSchema>;
export type ManagedNodeInput = z.infer<typeof managedNodeInputSchema>;
